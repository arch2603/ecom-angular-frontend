import { Component, OnInit } from '@angular/core';
import { ProductService } from 'src/app/services/product.service';
import { Product } from 'src/app/common/product';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-product-list',
  templateUrl: './product-list-grid.component.html',
  styleUrls: ['./product-list.component.css']
})
export class ProductListComponent implements OnInit {

  products: Product[] = [];
  currentCategoryId : number = 1;
  searchMode: boolean = false;
  
  constructor(private productService: ProductService, private route: ActivatedRoute) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(() => {
      this.listProducts(); //hook
    })
  }

  listProducts()
  {

    this.searchMode = this.route.snapshot.paramMap.has('keyword')

    if(this.searchMode){
      this.handleSearchProducts();
    }else{

      this.handleListProducts();
    }

  }

  handleListProducts()
  {
    const hasCategoryId : boolean = this.route.snapshot.paramMap.has('id');

    if(hasCategoryId){

      this.currentCategoryId = +this.route.snapshot.paramMap.get('id')!; //non-null assertion operator tells compiler object is not null
    
    }else{
        this.currentCategoryId = 1;
    }

    this.productService.getProductList(this.currentCategoryId).subscribe(
      data => {
        this.products = data; // data return is assign to the public field products above.
      }
    )
    console.log(this.products);
  }

  handleSearchProducts()
  {
    const theKeyWord: string = this.route.snapshot.paramMap.get('keyword')!;

    this.productService.searchProducts(theKeyWord).subscribe(
      data => {
        this.products = data;
      }
    );

  }

}
