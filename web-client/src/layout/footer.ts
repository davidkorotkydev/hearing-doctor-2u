import { Component, inject } from "@angular/core";

import { ColorSchemeService } from "@/core/color-scheme-service";

@Component({
    selector: "app-footer",
    templateUrl: "./footer.html",
})
export class Footer {
    protected scheme = inject(ColorSchemeService);
}
