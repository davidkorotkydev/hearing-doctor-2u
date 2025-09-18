import { Component, HostListener, inject, signal } from "@angular/core";

import { FormsModule } from "@angular/forms";
import { Router, RouterLink, RouterLinkActive } from "@angular/router";

import { AccountService } from "@/core/account-service";
import { Logo } from "@/svgs/logo";
import { Dropdown } from "@/ui/dropdown";

@Component({
    imports: [Dropdown, FormsModule, Logo, RouterLink, RouterLinkActive],
    selector: "app-header",
    styleUrl: "./header.css",
    templateUrl: "./header.html",
})
export class Header {
    protected accountService = inject(AccountService);
    protected isScrolled = signal(false);
    protected router = inject(Router);
    /** "(is) route" */
    protected r = (url: string) => this.router.url === url;

    @HostListener("window:scroll", [])
    onWindowScroll() {
        if (window.pageYOffset > 0) this.isScrolled.set(true);
        else this.isScrolled.set(false);
    }

    protected signOut() {
        this.accountService.deauthenticate();
        this.router.navigateByUrl("/");
    }
}
