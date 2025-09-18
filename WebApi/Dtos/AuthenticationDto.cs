namespace WebApi.Dtos;

public class AuthenticationDto
{
    public required string Email { get; set; }
    public required string Password { get; set; }
}
