import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import Account from 'App/Models/Account'
// import axios from 'axios';




export default class UsersController {
    public async index({request, response} :  HttpContextContract){
        try{
            const {email, name,password} = request.body()

            if (email && name && password){
                const isEmail = await Account
                    .query()
                    .where('email', email)
                    .orWhereNull('email')
                    .first();

                if(isEmail == null){
                    const createAccount = Account.create({
                        email : email,
                        name  : name,
                        password : password
                    })

                    const isUserCreated = (await createAccount).$isPersisted

                    if(isUserCreated){
                        const getUserId = await Account
                        .query()
                        .where('email', email)
                        .orWhereNull('email')
                        .first();

                        return {
                            status : "success",
                            user_id : getUserId?.$original.id,
                            message : "account has been created successfully"
                        }
                    } else {
                        response.status(500);

                        return {
                            status : "fail",
                            message : "failed to create account"
                        }
                    }
                }else {
                    response.status(400);

                    return {
                        status : "fail",
                        message : "email address already exists"
                    }
                }
            } else {
                response.status(400);
                return {
                    status : "fail",
                    message : "all basic information required"
                }
            }
        } catch (err) {
            console.log(err)
        }
    }
}
