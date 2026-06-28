import packageJson from "../../package.json";

export const STUDIO_VERSION = packageJson.version;

export const STUDIO_NAME = "MyEFvibe Studio";

export const STUDIO_DESCRIPTION =
  packageJson.description ?? "EF Core database client and LINQ scratchpad";

export const STUDIO_REPOSITORY = "https://github.com/yeahbah/my-ef-vibe-studio";

export const STUDIO_LICENSE = "Proprietary — MyEFvibe Studio License v1.1";

export const STUDIO_LICENSE_SUMMARY =
  "Personal use free; commercial use free for up to 5 developers per organization; per-seat license required beyond that.";

export const STUDIO_LICENSE_URL = `${STUDIO_REPOSITORY}/blob/main/LICENSE`;

export const STUDIO_COPYRIGHT = "Copyright © 2026 Yeahbah. All rights reserved.";

export const EFVIBE_REPOSITORY = "https://github.com/yeahbah/my-ef-vibe";

export const EFVIBE_WEBSITE = "https://myefvibe.com";

export const EFVIBE_NUGET = "https://www.nuget.org/packages/efvibe";
