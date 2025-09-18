import { Component, ElementRef, HostListener, input } from "@angular/core";

@Component({
    selector: "app-dropdown",
    styles: `
        .dropdown__container {
            @apply relative flex;
        }

        .dropdown__body {
            @apply absolute;
            animation: drop calc(var(--transition-duration) * 0.5) forwards;
            top: calc(100% - 1px);
        }

        @keyframes drop {
            to {
                top: 100%;
            }
        }
    `,
    template: `
        <div [class]="containerClass()" class="dropdown__container">
            <div (click)="isOpen = !isOpen">
                <ng-content select="#dropdown__head" />
            </div>
            @if (isOpen) {
                <div class="dropdown__body">
                    <ng-content select="#dropdown__body" />
                </div>
            }
        </div>
    `,
})
export class Dropdown {
    containerClass = input<string | undefined>();
    protected isOpen = false;

    constructor(private elementRef: ElementRef) {}

    @HostListener("document:click", ["$event"])
    onDocumentClick(event: MouseEvent) {
        if (this.isOpen && !this.elementRef.nativeElement.contains(event.target)) this.isOpen = false;
    }
}
