public record ProductSummaryDto
{
    public int ProductId { get; init; }
    public string? Name { get; init; }
    public decimal ListPrice { get; init; }
}
