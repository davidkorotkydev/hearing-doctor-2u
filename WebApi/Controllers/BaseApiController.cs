using Microsoft.AspNetCore.Mvc;

namespace WebApi.Controllers;

[ApiController]
/* `( ... )/api/( controller )` */
[Route("api/[controller]")]
public class BaseApiController : ControllerBase;
