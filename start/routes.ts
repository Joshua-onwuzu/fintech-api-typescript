/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
|
| This file is dedicated for defining HTTP routes. A single file is enough
| for majority of projects, however you can define routes in different
| files and just make sure to import them inside this file. For example
|
| Define routes in following two files
| ├── start/routes/cart.ts
| ├── start/routes/customer.ts
|
| and then import them inside `start/routes.ts` as follows
|
| import './routes/cart'
| import './routes/customer'
|
*/

import Route from '@ioc:Adonis/Core/Route';
import ngrok from 'ngrok';

const connectNgrok = async ()=>{
    const url = await ngrok.connect(3333);
    console.log(url)
}


Route.post('/create-user', 'UsersController.index');

Route.post('/fund/:userId', 'UsersController.fund');

Route.post('/transfer/:userId', 'UsersController.transfer');

Route.post('/add-beneficiary/:userId', 'UsersController.beneficiary');

Route.post('/withdrawal/:userId', 'UsersController.withdrawal')
