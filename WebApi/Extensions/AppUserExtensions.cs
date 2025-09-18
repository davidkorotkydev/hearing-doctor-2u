using WebApi.Dtos;
using WebApi.Entities;
using WebApi.Interfaces;

namespace WebApi.Extensions;

public static class AppUserExtensions
{
    public static UserDto ToDto(this AppUser user, ITokenService tokenService)
    {
        return new UserDto
        {
            DisplayName = user.DisplayName,
            Email = user.Email,
            Id = user.Id,
            Token = tokenService.CreateToken(user),
        };
    }
}
