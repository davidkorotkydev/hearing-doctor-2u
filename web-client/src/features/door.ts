import { Component, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";

import { AccountService } from "@/core/account-service";
import { RegistrationCredentials } from "@/types/user";

@Component({
    imports: [FormsModule],
    selector: "app-door",
    templateUrl: "./door.html",
})
export class Door {
    protected accountService = inject(AccountService);
    protected authenticationCredentials: any = {};
    protected registrationCredentials = {} as RegistrationCredentials;
    protected router = inject(Router);
    /** "(is) route" */
    protected r = (url: string) => this.router.url === url;

    protected logIn() {
        this.accountService.authenticate(this.authenticationCredentials).subscribe({
            error: (error) => {
                console.log(error);
            },
            next: () => {
                this.authenticationCredentials = {};
                this.router.navigateByUrl("/");
            },
        });
    }

    protected signUp() {
        this.accountService.register(this.registrationCredentials).subscribe({
            error: (error) => {
                console.log(error);
            },
            next: (response) => {
                console.log(response);
                this.router.navigateByUrl("/");
            },
        });
    }
}
