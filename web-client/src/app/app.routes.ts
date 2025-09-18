import { Routes } from "@angular/router";

import { Home } from "@/features/home";
import { Door } from "@/features/door";

/* [[.](https://angular.dev/guide/routing)] */
export const routes: Routes = [
    { path: "", component: Home },
    { path: "login", component: Door },
    { path: "signup", component: Door },
    { path: "**", component: Home },
];
