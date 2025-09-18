using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

using WebApi.Data;
using WebApi.Interfaces;
using WebApi.Services;

namespace WebApi;

public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);
        /* Add services to the container. */
        builder.Services.AddControllers();
        builder.Services.AddDbContext<AppDbContext>(opt => { opt.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")); });
        builder.Services.AddCors();
        var secretService = new SecretService();
        builder.Services.AddSingleton(secretService);
        builder.Services.AddScoped<ITokenService, TokenService>();

        builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(opt =>
        {
            opt.TokenValidationParameters = new TokenValidationParameters
            {
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretService.GetJwtTokenKey())),
                ValidateAudience = false,
                ValidateIssuer = false,
                ValidateIssuerSigningKey = true,
            };
        });

        var app = builder.Build();
        /* Configure the HTTP request pipeline, our "middleware". Order matters here. */
        app.UseCors(policy => { policy.AllowAnyHeader().AllowAnyMethod().WithOrigins("http://localhost:4200", "https://localhost:4200"); });
        /* Who are you? */
        app.UseAuthentication();
        /* Are you allowed to do what you are doing? */
        app.UseAuthorization();
        app.MapControllers();
        app.Run();
    }
}
