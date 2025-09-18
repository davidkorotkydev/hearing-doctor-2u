namespace WebApi.Entities;

public class AppUser
{
    public required string DisplayName { get; set; }
    public required string Email { get; set; }
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public required byte[] PasswordHash { get; set; }
    public required byte[] PasswordSalt { get; set; }
}
