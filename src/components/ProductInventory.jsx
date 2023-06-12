import React, {useState, useEffect} from 'react'
import axios from 'axios';
import {openDB, deleteDB} from 'idb';

const ProductInventory = () => {
    
    useEffect(()=>{
        const handleOnlineStatus = ()=>{
            if(navigator.onLine){
                // console.log('onlinepro')
                syncData();
            }else{
                // console.log('application offline');
            }
        };
        handleOnlineStatus();
        const interval  = setInterval(handleOnlineStatus, 3000);
        return()=>{
            clearInterval(interval);
        }

    },[]);

    const DB_NAME = 'productInventoryDB';
    const STORE_NAME = 'products';

    const DB_ADD = 'productAddDB';
    const STORE_ADD = 'insertOne';

    const DB_DELETE = 'productDeleteDB';
    const STORE_DELETE = 'deleteMany';

    const [products, setProducts] = useState([]);
    const [newProduct, setNewProduct] = useState({
        _id:'',
        name:'',
        quantity:'',
        image:'',
        variant:'',
        price:''
    })


    const openDatabase = ()=>{
        return openDB(DB_NAME, 1, {
            upgrade(db) {
                if(!db.objectStoreNames.contains(STORE_NAME)){
                    db.createObjectStore(STORE_NAME, {keyPath:'_id'});
                }
              },
        });
    }
    const addDatabase = ()=>{
        let i  = 1
        return openDB(DB_ADD, 50000, {
            upgrade(db) {
                if(!db.objectStoreNames.contains(STORE_ADD)){
                    db.createObjectStore(STORE_ADD, {keyPath:'_id'});
                }
              },
        });
    }
    const deleteDatabase = ()=>{
        return openDB(DB_DELETE, 50000, {
            upgrade(db) {
                if(!db.objectStoreNames.contains(STORE_DELETE)){
                    db.createObjectStore(STORE_DELETE, {keyPath:'_id'});
                }
              },
        });
    }
    useEffect(()=>{
        openDatabase().then(()=>{
            fetchProducts();
        }).catch((error)=>{
            console.log('error opening database',error);
        });
    },[]);
    

    const fetchProducts = async ()=>{
        try{
            //fetching online first
            const response = await axios.get('https://prodsync.vercel.app/api/product');
            const onlineProducts = response.data;
            console.log("online",onlineProducts)
            //offline   
            const db = await openDatabase();
            const transaction = db.transaction(STORE_NAME,'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            if(onlineProducts){
            onlineProducts.forEach(async (product)=>{
                await store.put (product);
            });
            }
            const offlineProducts = await store.getAll();
            setProducts(offlineProducts);
            
            console.log('fetched')
        }catch(error){
            console.log('error fetching products', error);
        }
    }


    const handleInputChange =(e)=>{
        const {name, value} = e.target;
        setNewProduct({...newProduct, [name]: value})
    }
    const addProduct = async ()=>{
        console.log(newProduct);
        try{
            //new added product db 
            const db = await addDatabase();
            const transaction = db.transaction(STORE_ADD,'readwrite');
            const store = transaction.objectStore(STORE_ADD);

            await store.put(newProduct);

            // all product db
            const alldb = await openDatabase();
            const alltransaction = alldb.transaction(STORE_NAME,'readwrite');
            const allstore = alltransaction.objectStore(STORE_NAME);
            await allstore.put(newProduct);

            let allProducts = products
            allProducts.push(newProduct);
            setProducts(allProducts);
            setNewProduct({
                _id:'',
                name:'',
                quantity:'',
                image:'',
                variant:'',
                price:'' 
            });

            // await fetchProducts();
        }catch(error){
            console.error('Error while adding Products:', error);
        }

    }

    const removeProduct = async (productId)=>{
        var obj = {
            _id: productId
        }
        try {
            const db = await deleteDatabase();
            const transaction = db.transaction(STORE_DELETE,'readwrite');
            const store = transaction.objectStore(STORE_DELETE);
            await store.put (obj);
            const updatedProducts = products.filter((product)=> product._id !== productId);
                setProducts(updatedProducts);
                console.log('removed', productId)


                 // all product db
            const alldb = await openDatabase();
            const alltransaction = alldb.transaction(STORE_NAME,'readwrite');
            const allstore = alltransaction.objectStore(STORE_NAME);
            await allstore.delete(productId);
        }catch(error){
            console.log('error removing product:', error);
        }
    }

    const editProduct = (productId)=>{
        console.log('edit',productId);
    }

    const syncData = async()=>{
        const dbAdd = await addDatabase();
        const transactionAdd = dbAdd.transaction(STORE_ADD,'readwrite');
        const storeAdd = transactionAdd.objectStore(STORE_ADD);
        const addedProducts = await storeAdd.getAll();
        console.log('sync', addedProducts);

        const dbDelete = await deleteDatabase();
            const transactionDelete = dbDelete.transaction(STORE_DELETE,'readwrite');
            const storeDelete = transactionDelete.objectStore(STORE_DELETE);
            const deletedProducts = await storeDelete.getAll();
            console.log('sync', deletedProducts);
            if(addedProducts.length >0 || deletedProducts.length >0){
               
                const updatedProducts = [{_id: 'abc1000', name: 'Mobile Phone', quantity: '1000', image: 'https://www.google.com', variant: '', price: 4000},];
                const arr = [
                    ...addedProducts.map((product) => ({ insertOne: { document: product } })),
                    ...updatedProducts.map((product) => ({
                      updateOne: {
                        filter: { sku: product._id },
                        update: { $set: product }
                      }
                    })),
                    ...deletedProducts.map((product) => ({ deleteMany: { filter: { sku: product._id } } }))
                  ];
                  const jsonArr = JSON.stringify(arr);
                  console.log('arrrrrr', jsonArr);
                  
            try {
                await axios.post('https://prodsync.vercel.app/api/product/sync', jsonArr);
                // await storeDelete.clear();
                // await storeAdd.clear();
            } catch(error){
                console.log(error)
            }
        }
    }

    return (
    <div className='container'>
        <h3>Add New Product</h3>
        <div className='productAddContainer'>
            <input type='text' placeholder='Product Id' name='_id' value={newProduct._id} onChange={handleInputChange}/>
            <input type='text' placeholder='Product Name' name='name' value={newProduct.name} onChange={handleInputChange}/>
            <input type='text' placeholder='Quantity' name='quantity' value={newProduct.quantity} onChange={handleInputChange}/>
            <input type='text' placeholder='Image URL' name='image' value={newProduct.image} onChange={handleInputChange}/>
            <input type='text' placeholder='Variant' name='variant' value={newProduct.variant} onChange={handleInputChange}/>
            <input type='number' placeholder='Price' name='price' value={newProduct.price} onChange={handleInputChange}/>

            <button onClick={addProduct}>Add Product</button>
        </div>

        {/* Displaying Product Inventory Code Starts Here! */}
        <div>
            <h3>Product Inventory</h3>
            {products?.map((product)=>(
                <div className='product' key={product._id}>
                    <p>{product._id}</p>
                    <h4>{product.name}</h4>
                    <p>{product.quantity}</p>
                    <img src={product.image} alt={product.name}/>
                    <p>{product.variant}</p>
                    <div>
                        {/* <button onClick={()=>editProduct(product._id)}> Edit</button> */}
                        <button onClick={()=>removeProduct(product._id)}> Remove</button>
                    </div>
                </div>
            ))}
        </div>
        
    </div>
  )
}

export default ProductInventory