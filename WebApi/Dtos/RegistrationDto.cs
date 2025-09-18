using System.ComponentModel.DataAnnotations;

namespace WebApi.Dtos;

public class RegistrationDto
{
    [Required]
    public required string DisplayName { get; set; } = "";
    /* This does _not_ require a top-level domain. */
    [EmailAddress]
    [Required]
    public required string Email { get; set; } = "";
    [MinLength(4)]
    [Required]
    public required string Password { get; set; } = "";
}
