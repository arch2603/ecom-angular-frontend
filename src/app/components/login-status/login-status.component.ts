import { Component, Inject, OnInit } from '@angular/core';
import { OktaAuthStateService, OKTA_AUTH } from '@okta/okta-angular';
import OktaAuth from '@okta/okta-auth-js';

@Component({
  selector: 'app-login-status',
  templateUrl: './login-status.component.html',
  styleUrls: ['./login-status.component.css']
})
export class LoginStatusComponent implements OnInit {

  isAuthenticated: boolean = false;
  userFullName: string = '';
  storage: Storage = sessionStorage;

  constructor(private oktaAuthService: OktaAuthStateService, @Inject(OKTA_AUTH) private oktaAuth: OktaAuth) { }

  ngOnInit(): void {
    //subcribe o authentication state changes
    this.oktaAuthService.authState$.subscribe( (result) => {
      
      this.isAuthenticated = result.isAuthenticated!;
      this.getUserDetails();
    });
  }

  getUserDetails() {
    if (this.isAuthenticated) {
      //Fetched the logged in user details (user's claims)
      //user full name is exposed as a property
      this.oktaAuth.getUser().then(
        (res) => {
          this.userFullName = res.name as string;
          const theEmail = res.email;
          this.storage.setItem('userEmail', JSON.stringify(theEmail));
        }
      );
    }
  }

  logout() {
    //Terninate the session with Okta and removes the current tokens
    this.oktaAuth.signOut();
  }

}
