import { Component } from "@angular/core";

import { HeroAnimation } from "@/svgs/hero-animation";

@Component({
    imports: [HeroAnimation],
    selector: "app-home",
    styleUrl: "./home.css",
    templateUrl: "./home.html",
})
export class Home {}
