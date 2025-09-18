namespace WebApi.Services;

public class SecretService
{
    private readonly string jwtTokenKey;

    public SecretService(string path = "Secrets")
    {
        var jwtTokenKeyPath = Path.Combine(path, "JwtTokenKey.txt");
        if (!File.Exists(jwtTokenKeyPath)) throw new FileNotFoundException("The JWT token key file cannot be found at `" + jwtTokenKeyPath + "`");
        var jwtTokenKey = File.ReadAllText(jwtTokenKeyPath).Trim();
        if (string.IsNullOrWhiteSpace(jwtTokenKey)) throw new InvalidOperationException("The JWT token key file `" + jwtTokenKeyPath + "` is empty.");
        this.jwtTokenKey = jwtTokenKey;
    }

    public string GetJwtTokenKey() => jwtTokenKey;
}
