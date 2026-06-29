#load "constants.csx"

using AdventureWorks.Domain.Entities.Production;

Expression<Func<Product, bool>> IsActiveProduct =
    p => !p.DiscontinuedDate.HasValue && p.ListPrice > MinListPrice;

IQueryable<Product> ActiveProducts() =>
    db.Products.Where(IsActiveProduct);
