import { Routes } from '@angular/router';
import { authGuardFn } from '@auth0/auth0-angular';
import { ProfileComponent } from './components/profile.component';
import { InboxComponent } from './features/messages/inbox/inbox.component';
import { SendMessageComponent } from './features/messages/send/send-message.component';
import { HomeComponent } from './features/home/home.component';

export const routes: Routes = [
    {
        path: 'profile',
        component: ProfileComponent,
        canActivate: [authGuardFn]
    },
    {
        path: 'inbox',
        component: InboxComponent,
        canActivate: [authGuardFn]
    },
    {
        path: 'send',
        component: SendMessageComponent,
        canActivate: [authGuardFn]
    },
    {
        path: '',
        component: HomeComponent
    }
];
