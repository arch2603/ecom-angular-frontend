import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Country } from 'src/app/common/country';
import { Order } from 'src/app/common/order';
import { OrderItem } from 'src/app/common/order-item';
import { PaymentInfo } from 'src/app/common/payment-info';
import { Purchase } from 'src/app/common/purchase';
import { State } from 'src/app/common/state';
import { CartService } from 'src/app/services/cart.service';
import { CheckoutService } from 'src/app/services/checkout.service';
import { Luv2ShopFormService } from 'src/app/services/luv2-shop-form.service';
import { Luv2ShopValidators } from 'src/app/validators/luv2-shop-validators';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.css']
})
export class CheckoutComponent implements OnInit {

  checkoutFormGroup!: FormGroup;
  totalPrice: number = 0;
  totalQuantity: number = 0;

  creditCardYears: number[] = [];
  creditCardMonths: number[] = [];

  countries: Country[ ] = [];

  shippingAddressSates: State[] = [];
  billingAddressStates: State[] = [];

  storage: Storage = sessionStorage;

  stripe = Stripe(environment.stripePublishableKey);
  paymentInfo: PaymentInfo = new PaymentInfo();
  cardElement: any;
  displayError: any = "";

  constructor( private formBuilder: FormBuilder, 
               private luv2ShopFormService: Luv2ShopFormService, 
               private cartService: CartService,
               private checkoutService: CheckoutService,
               private router: Router) { }

  ngOnInit(): void {

    this.setupStripePaymentForm();

    this.reveiwCartDetails();

    //read the user email address from the browser storage
    const theEmail = JSON.parse(this.storage.getItem('userEmail')!);

    this.checkoutFormGroup = this.formBuilder.group({
      customer: this.formBuilder.group({
        firstName: new FormControl('', [Validators.required, Validators.minLength(2), Luv2ShopValidators.notOnlyWhitespace]),
        lastName: new FormControl('', [Validators.required, Validators.minLength(2), Luv2ShopValidators.notOnlyWhitespace]),
        email: new FormControl(theEmail, 
                              [ Validators.required, 
                                Validators.pattern('^[a-z0-9._%+-]+@[a-z0-9]+.[a-z]{2,4}$' )])
      }),
      shippingAddress: this.formBuilder.group({
        street: new FormControl('', [Validators.required, Validators.minLength(2), Luv2ShopValidators.notOnlyWhitespace]),
        city: new FormControl('', [Validators.required, Validators.minLength(2), Luv2ShopValidators.notOnlyWhitespace]),
        state: new FormControl('', [Validators.required]),
        country: new FormControl('', [Validators.required]),
        zipCode: new FormControl('', [Validators.required, Validators.minLength(2), Luv2ShopValidators.notOnlyWhitespace])
      }),
      billingAddress: this.formBuilder.group({
        street: new FormControl('', [Validators.required, Validators.minLength(2), Luv2ShopValidators.notOnlyWhitespace]),
        city: new FormControl('', [Validators.required, Validators.minLength(2), Luv2ShopValidators.notOnlyWhitespace]),
        state: new FormControl('', [Validators.required]),
        country: new FormControl('', [Validators.required]),
        zipCode: new FormControl('', [Validators.required, Validators.minLength(2), Luv2ShopValidators.notOnlyWhitespace])
      }),
      
     /* creditCard: this.formBuilder.group({
        cardType: new FormControl('', [Validators.required]),
        nameOnCard: new FormControl('', [Validators.required, Validators.minLength(2), Luv2ShopValidators.notOnlyWhitespace]),
        cardNumber: new FormControl('', [Validators.pattern('[0-9]{16}'), Validators.required]),
        securityCode: new FormControl('', [Validators.pattern('[0-9]{3}'), Validators.required]),
        expirationMonth: [''],
        expirationYear: ['']
      }), */

    });

   /* const startMonth: number = new Date().getMonth() + 1;
    console.log("startMonth: " + startMonth);
    
    this.luv2ShopFormService.getCreditCardMonths(startMonth).subscribe(
      data => {
        console.log("Retrieved credit card months: " + JSON.stringify(data));
        this.creditCardMonths = data;
      }
    ); */

    /*
    this.luv2ShopFormService.getCreditCardYears().subscribe(
      data => {
        console.log("Retrieved credit card years: " + JSON.stringify(data));
        this.creditCardYears = data;
      }
    ); */

    this.luv2ShopFormService.getCountries().subscribe(
      data => {
        console.log("Retrived countries: " + JSON.stringify(data));
        this.countries = data;
      }
    );    
  }

  setupStripePaymentForm() {
    //get handle to stripe elements
    var elements = this.stripe.elements();

    //Create a card elment
    this.cardElement = elements.create('card', {hidePostalCode: true});

    //Add an instane of card UI compoment into the 'card-element' div
    this.cardElement.mount('#card-element');

    //add event binding for the change event on thr card element
    this.cardElement.on('change', (event: any) => {
      this.displayError = document.getElementById('card-errors');
      if(event.complete) {
        this.displayError.textContent = "";
      }else if(event.error){
        this.displayError.textContent = event.error.message;
      }
    });
  }
  
  reveiwCartDetails() {
    //subscribe to the cartService.totalQuantity
    this.cartService.totalQuantity.subscribe(
      totalQuantity => this.totalQuantity = totalQuantity
    );

    //subscribe to the cartService.totalPrice
    this.cartService.totalPrice.subscribe(
      totalPrice => this.totalPrice = totalPrice
    );
  }

  //@ts-ignore
  copyShippingAddressToBillingAddress(event) {
    if (event.target.checked) {
      //@ts-ignore
      this.checkoutFormGroup.controls.billingAddress.setValue(this.checkoutFormGroup.controls.shippingAddress.value);

      this.billingAddressStates = this.shippingAddressSates;
    }
    else {
    //@ts-ignore
      this.checkoutFormGroup.controls.billingAddress.reset();

      this.billingAddressStates = [];
    }
  }

  onSubmit() {

    if (this.checkoutFormGroup.invalid) {
      this.checkoutFormGroup.markAllAsTouched();
      return;
    }
    //setup order
    let order = new Order();
    order.totalPrice = this.totalPrice;
    order.totalQuantity = this.totalQuantity;

    //get cart items
    const cartItems = this.cartService.cartItems;
    //long-way
    /* let orderItems: OrderItem[] = [];
    // for(let i=0; cartItems.length; i++) {
    //   orderItems[i] = new OrderItem(cartItems[i]);
    } */

    //short-way
    //create orderItems form cartItems
    let orderItems: OrderItem[] = cartItems.map(tempCartItem => new OrderItem(tempCartItem))

    //setup purchase
    let purchase = new Purchase();

    //populate purcahse - customer
    purchase.customer = this.checkoutFormGroup.controls['customer'].value;
    //populate purchase - shipping address
    purchase.shippingAddress = this.checkoutFormGroup.controls['shippingAddress'].value;
    const shippingState: State = JSON.parse(JSON.stringify(purchase.shippingAddress!.state));
    const shippingCountry: Country = JSON.parse(JSON.stringify(purchase.shippingAddress!.country));
    purchase.shippingAddress!.state = shippingState.name;
    purchase.shippingAddress!.country = shippingCountry.name; 

    //populate purchase - billing address
    purchase.billingAddress = this.checkoutFormGroup.controls['billingAddress'].value;
    const billingState: State = JSON.parse(JSON.stringify(purchase.billingAddress!.state));
    const billingCountry: Country = JSON.parse(JSON.stringify(purchase.billingAddress!.country));
    purchase.billingAddress!.state = billingState.name;
    purchase.billingAddress!.country = billingCountry.name; 

    //populate purchase - order and orderItems
    purchase.order = order;
    purchase.orderItems = orderItems;

    //compute payment info
    this.paymentInfo.amount = this.totalPrice * 100;
    this.paymentInfo.currency = "USD";

    // id valid form:
        //- create payment intent
        //- confirm card payment
        //- place order
    if(!this.checkoutFormGroup.invalid && this.displayError.textContent === "") {
      //invoke Springboot payment API
      this.checkoutService.createPaymentIntent(this.paymentInfo).subscribe(
        (paymentIntentResponse) => {
          //Stripe API method(confirmCardPayment)
          this.stripe.confirmCardPayment(paymentIntentResponse.client_secret, 
              {
                payment_method: {
                  card: this.cardElement
                }
              }, { handleActions: false } ).then((result: any) => {
                  if(result.error) {
                    //inform user of the error
                    alert(`There was an error: ${result.error.message}`);
                  }else{
                    //call REST API checkout service
                    this.checkoutService.placeOrder(purchase).subscribe({
                      next: (response: any) => {
                        alert(`Your order has been received. \nOrder tracking number: ${response.orderTrackingNumber}`);
                        //reset the cart
                        this.resetCart();
                      },
                      error: (err: any) => {
                        alert(`There was an error: ${err.message}`);
                      }
                    })
                  }
              });
        }
      );
    } else {
      this.checkoutFormGroup.markAllAsTouched();
      return;
    }   

    console.log("Handling the submit button");
    // console.log(this.checkoutFormGroup.get('customer')!.value);
    // console.log("The email address is " + this.checkoutFormGroup.get('customer')!.value.email);
  }

  resetCart() {
    //reset the cart data
    this.cartService.cartItems = [];
    this.cartService.totalPrice.next(0);
    this.cartService.totalQuantity.next(0);

    //reset the form
    this.checkoutFormGroup.reset();

    //navigate to the products page
    this.router.navigateByUrl("/products");
  }

  // handleMonthsAndYears() {
  //   const creditCardFormGroup = this.checkoutFormGroup.get('creditCard');

  //   const currentYear: number = new Date().getFullYear();
  //   const selectedYear: number = Number(creditCardFormGroup?.value.expirationYear);

  //   let startMonth: number;

  //   if(currentYear === selectedYear) {
  //     startMonth = new Date().getMonth() + 1;
  //   }else {
  //     startMonth = 1;
  //   }

  //   this.luv2ShopFormService.getCreditCardMonths(startMonth).subscribe(
  //     data => {
  //       console.log("Retrieved credit card months base on change: " + JSON.stringify(data));
  //       this.creditCardMonths = data;
  //     }
  //   )
  // }

  getStates(formGroupName: string) {
    const formGroup = this.checkoutFormGroup.get(formGroupName);
    const countryCode = formGroup?.value.country.code;
    const countryName = formGroup?.value.country.name;

    console.log(`${formGroupName} country code: ${countryCode}`);
    console.log(`${formGroupName} country code: ${countryName}`);

    this.luv2ShopFormService.getStates(countryCode).subscribe(
      data => {
          if(formGroupName === 'shippingAddress') {
            this.shippingAddressSates = data;
          } else {
            this.billingAddressStates = data
          }
          //select the first state by default i.e. alphabetical order
          formGroup?.get('state')?.setValue(data[0]);
      }
    );
  }

  get firstName() { return this.checkoutFormGroup.get('customer.firstName'); }

  get lastName() { return this.checkoutFormGroup.get('customer.lastName'); }

  get email() { return this.checkoutFormGroup.get('customer.email'); }

  get shippingAddressStreet() { return this.checkoutFormGroup.get('shippingAddress.street'); }

  get shippingAddressCity() { return this.checkoutFormGroup.get('shippingAddress.city'); }

  get shippingAddressZipCode() { return this.checkoutFormGroup.get('shippingAddress.zipCode'); }

  get shippingAddressState() { return this.checkoutFormGroup.get('shippingAddress.state'); }

  get shippingAddressCountry() { return this.checkoutFormGroup.get('shippingAddress.country'); }

  get billingAddressStreet() { return this.checkoutFormGroup.get('billingAddress.street'); }

  get billingAddressCity() { return this.checkoutFormGroup.get('billingAddress.city'); }

  get billingAddressZipCode() { return this.checkoutFormGroup.get('billingAddress.zipCode'); }

  get billingAddressState() { return this.checkoutFormGroup.get('billingAddress.state'); }

  get billingAddressCountry() { return this.checkoutFormGroup.get('billingAddress.country'); }

  
  get creditCardType() { return this.checkoutFormGroup.get('creditCard.cardType'); }

  get creditCardNameOnCard() { return this.checkoutFormGroup.get('creditCard.nameOnCard'); }

  get creditCardNumber() { return this.checkoutFormGroup.get('creditCard.cardNumber'); }

  get creditCardSecurityCode() { return this.checkoutFormGroup.get('creditCard.securityCode'); }
}
