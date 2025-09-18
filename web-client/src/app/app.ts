import { HttpClient } from "@angular/common/http";
import { Component, OnInit, inject, signal } from "@angular/core";
import { Router, RouterOutlet } from "@angular/router";
import { lastValueFrom } from "rxjs";

import { AccountService } from "@/core/account-service";
import { Footer } from "@/layout/footer";
import { Header } from "@/layout/header";
import { User } from "@/types/user";

@Component({
    imports: [Footer, Header, RouterOutlet],
    selector: "app-root",
    templateUrl: "./app.html",
})
export class App implements OnInit {
    private accountService = inject(AccountService);
    private http = inject(HttpClient);
    protected members = signal<User[]>([]);
    protected router = inject(Router);
    protected title = "Hearing Doctor 2U";

    private async getMembers() {
        try {
            return lastValueFrom(this.http.get<User[]>("https://localhost:10443/api/members"));
        } catch (error) {
            console.log(error);
            throw error;
        }
    }

    async ngOnInit(): Promise<void> {
        this.members.set(await this.getMembers());
        this.setCurrentUser();
    }

    protected setCurrentUser() {
        const userString = localStorage.getItem("user");
        if (userString === null) return;
        const user = JSON.parse(userString);
        this.accountService.setCurrentUser(user);
    }
}
