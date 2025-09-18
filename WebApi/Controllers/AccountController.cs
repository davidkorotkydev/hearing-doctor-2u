using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;

using WebApi.Data;
using WebApi.Dtos;
using WebApi.Entities;
using WebApi.Extensions;
using WebApi.Interfaces;

namespace WebApi.Controllers;

public class AccountController(AppDbContext context, ITokenService tokenService) : BaseApiController
{
    private async Task<bool> EmailExists(string email)
    {
        return await context.Users.AnyAsync(pred => pred.Email.ToLower() == email.ToLower());
    }

    /* `( ... )/account/authenticate` */
    [HttpPost("authenticate")]
    public async Task<ActionResult<UserDto>> Authenticate(AuthenticationDto authenticationDto)
    {
        var user = await context.Users.SingleOrDefaultAsync(pred => pred.Email == authenticationDto.Email);
        if (user == null) return Unauthorized("\"The email is invalid.\"");
        using var hmac = new HMACSHA512(user.PasswordSalt);
        var computedHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(authenticationDto.Password));

        for (var i = 0; i < computedHash.Length; i++)
        {
            if (computedHash[i] != user.PasswordHash[i]) return Unauthorized("The password is invalid.");
        }

        return user.ToDto(tokenService);
    }

    /* `( ... )/account/register` */
    [HttpPost("register")]
    /* `ActionResult<T>` expects a `T` is returned. An alternative is the `IActionResult` which can return any type. */
    public async Task<ActionResult<UserDto>> Register(RegistrationDto registrationDto)
    {
        if (await EmailExists(registrationDto.Email)) return BadRequest("The email is taken.");
        /* The `using` keyword ensures the object just created will be "disposed" at the end of this scope [[.](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/using)]. */
        using var hmac = new HMACSHA512();

        var user = new AppUser
        {
            DisplayName = registrationDto.DisplayName,
            Email = registrationDto.Email,
            PasswordHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(registrationDto.Password)),
            PasswordSalt = hmac.Key,
        };

        /* This call does not typically need to be asynchronous, because it merely "tracks" entities to be added to the database. Only when `SaveChanges` is called is the data actually written. */
        context.Users.Add(user);
        await context.SaveChangesAsync();
        return user.ToDto(tokenService);
    }
}
