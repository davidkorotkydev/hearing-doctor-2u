using Microsoft.EntityFrameworkCore;

using WebApi.Entities;

namespace WebApi.Data;

public class AppDbContext(DbContextOptions options) : DbContext(options)
{
    public DbSet<AppUser> Users { get; set; }
}
