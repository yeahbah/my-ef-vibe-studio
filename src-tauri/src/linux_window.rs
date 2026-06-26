//! On Linux, Tauri v2 installs a GTK client-side title bar (GNOME/Adwaita style) with
//! window controls on the right. That bypasses KDE/KWin server-side decorations, so
//! Plasma settings such as "buttons on the left" are ignored. Remove the GTK title bar
//! so the compositor can decorate the window using the desktop theme.
//!
//! Fit the initial window into the monitor work area so it does not cover KDE panels.

use gdk::prelude::*;
use gdk::{Rectangle, WindowState};
use gtk::glib;
use gtk::prelude::*;
use std::cell::Cell;
use tauri::{App, Manager};

const WORK_AREA_MARGIN: i32 = 24;

thread_local! {
    static CLAMPING: Cell<bool> = const { Cell::new(false) };
    static INITIAL_FIT_DONE: Cell<bool> = const { Cell::new(false) };
}

pub fn use_system_window_decorations(app: &App) -> Result<(), Box<dyn std::error::Error>> {
    // Packaged AppImages use bundled GTK where late decoration changes can crash.
    if std::env::var_os("APPIMAGE").is_some() {
        return Ok(());
    }

    let window = app
        .get_webview_window("main")
        .ok_or("'main' window not found")?
        .clone();

    if let Ok(gtk_window) = window.gtk_window() {
        if !gtk_window.is_realized() {
            gtk_window.set_titlebar(Option::<&gtk::Widget>::None);
            bind_work_area_constraints(gtk_window.upcast_ref());
            return Ok(());
        }
    }

    // Defer GTK calls until the native window exists (avoids AppImage launch crashes).
    glib::idle_add_local_once(move || {
        let Ok(gtk_window) = window.gtk_window() else {
            eprintln!("efvibe Studio: could not access GTK window for decorations");
            return;
        };

        gtk_window.set_titlebar(Option::<&gtk::Widget>::None);
        bind_work_area_constraints(gtk_window.upcast_ref());
    });

    Ok(())
}

fn work_area_for_window(window: &gtk::Window) -> Rectangle {
    let display = window.display();

    if let Some(gdk_window) = window.window() {
        if let Some(monitor) = display.monitor_at_window(&gdk_window) {
            return monitor.workarea();
        }
    }

    display
        .primary_monitor()
        .map(|monitor| monitor.workarea())
        .unwrap_or_else(|| Rectangle::new(0, 0, 800, 600))
}

fn window_bounds(window: &gtk::Window) -> Rectangle {
    let (x, y) = window.position();
    let (width, height) = window.size();
    Rectangle::new(x, y, width as i32, height as i32)
}

fn exceeds_work_area(bounds: &Rectangle, work: &Rectangle) -> bool {
    bounds.x() < work.x()
        || bounds.y() < work.y()
        || bounds.x() + bounds.width() > work.x() + work.width()
        || bounds.y() + bounds.height() > work.y() + work.height()
}

fn is_fullscreen(window: &gtk::Window) -> bool {
    window
        .window()
        .map(|gdk_window| gdk_window.state().contains(WindowState::FULLSCREEN))
        .unwrap_or(false)
}

fn max_client_size(work: &Rectangle) -> (i32, i32) {
    (
        (work.width() - WORK_AREA_MARGIN * 2).max(320),
        (work.height() - WORK_AREA_MARGIN * 2).max(240),
    )
}

fn center_in_work_area(work: &Rectangle, width: i32, height: i32) -> (i32, i32) {
    let x = work.x() + (work.width() - width) / 2;
    let y = work.y() + (work.height() - height) / 2;
    (x, y)
}

fn fit_initial_window(window: &gtk::Window) {
    if INITIAL_FIT_DONE.with(|guard| guard.get()) {
        return;
    }

    if window.is_maximized() || is_fullscreen(window) {
        return;
    }

    INITIAL_FIT_DONE.with(|guard| guard.set(true));

    let work = work_area_for_window(window);
    let (current_width, current_height) = window.size();
    let (max_width, max_height) = max_client_size(&work);
    let width = (current_width as i32).min(max_width);
    let height = (current_height as i32).min(max_height);
    let (x, y) = center_in_work_area(&work, width, height);

    CLAMPING.with(|guard| guard.set(true));
    window.resize(width, height);
    window.move_(x, y);
    CLAMPING.with(|guard| guard.set(false));
}

fn constrain_to_work_area(window: &gtk::Window) {
    if CLAMPING.with(|guard| guard.get()) {
        return;
    }

    if window.is_maximized() || is_fullscreen(window) {
        return;
    }

    let work = work_area_for_window(window);
    let bounds = window_bounds(window);

    if !exceeds_work_area(&bounds, &work) {
        return;
    }

    CLAMPING.with(|guard| guard.set(true));

    let (max_width, max_height) = max_client_size(&work);
    let width = bounds.width().min(max_width);
    let height = bounds.height().min(max_height);
    let (x, y) = center_in_work_area(&work, width, height);

    window.resize(width, height);
    window.move_(x, y);

    CLAMPING.with(|guard| guard.set(false));
}

fn schedule_initial_fit(window: &gtk::Window) {
    let window = window.clone();
    glib::idle_add_local_once(move || fit_initial_window(&window));
}

fn schedule_work_area_clamp(window: &gtk::Window) {
    let window = window.clone();
    glib::idle_add_local_once(move || constrain_to_work_area(&window));
}

fn bind_work_area_constraints(window: &gtk::Window) {
    window.connect_show(|window| {
        schedule_initial_fit(window);
    });

    window.connect_configure_event(|window, _event| {
        if !INITIAL_FIT_DONE.with(|guard| guard.get()) {
            schedule_initial_fit(window);
        } else if !window.is_maximized() && !is_fullscreen(window) {
            schedule_work_area_clamp(window);
        }
        false
    });
}
