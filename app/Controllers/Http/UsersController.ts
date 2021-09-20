import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import Hash from '@ioc:Adonis/Core/Hash';
import Account from 'App/Models/Account';
import {paystackFundHandler, paystackTransferHandler} from './paystackHandler/paystackHandler';







export default class UsersController {
    public async index({request, response} :  HttpContextContract){
        try{
            const {email, name,password} = request.body();

            if (email && name && password){
                const isEmail = await Account
                    .query()
                    .where('email', email)
                    .orWhereNull('email')
                    .first();

                if(isEmail == null){
                    const userPassword = await Hash.make(password)
                    const createAccount = Account.create({
                        email : email,
                        name  : name,
                        password : userPassword,
                        account_balance : 0
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

    public async fund ({request, response, params}: HttpContextContract){
        try{
            const {amount,bank,account_number,otp} = request.body();
            
            if (amount && bank && account_number && otp){
                const id = await Account.find(params.userId);
                if (id !== null){
                    const userEmail = id?.$original.email;

                    const bankDetail = {
                        email : userEmail,
                        amount : amount,
                        bank :{
                            code : bank,
                            account_number : account_number
                        },
                        birthday: "1995-12-23"
                    }

                    const paystack = await paystackFundHandler(bankDetail,otp)

                    if (paystack){
                        const fundedAmount = paystack.data.amount ;
                        const fundedEmail = paystack.data.customer.email ;
                        
                        response.status(200);
                        return {
                            status : "success",
                            amount : fundedAmount,
                            email : fundedEmail,
                            message : "successfully funded your account"
                        }
                    }else {
                        response.status(400)
                        return {
                            status : "fail",
                            message : "invalid bank info"
                        }
                    }

                } else {
                        response.status(400);
                        return {
                            status : "fail",
                            message : "user not found"
                        }
                    }
                
            } else{
                response.status(400);
                return {
                    status : "fail",
                    message : "all field required"
                }
            }
        } catch (err){
            console.log(err)
        }
    }

    public async transfer ({request,response, params}: HttpContextContract){
        try {
            const {email, amount,password} = request.body();
            
            const id = await Account.find(params.userId);

            const userPassword = id?.$original.password ;

            if (email && amount && password){
                
                if(id !== null){

                    if (await Hash.verify(userPassword, password)){
                        const getBalance = id?.$original.account_balance;

                        const checkRecieverEmail = await Account
                        .query()
                        .where('email', email)
                        .orWhereNull('email')
                        .first();

                        if (checkRecieverEmail){
                            if(getBalance > amount){
                                const newBalance = parseInt(getBalance)  - parseInt(amount) ;
            
                                await id.merge({account_balance : newBalance}).save();
            
                                    const recieverBalance = checkRecieverEmail?.$original.account_balance;
            
                                    const newRecieverBal = parseInt(amount)  + parseInt(recieverBalance);
                                try{
                                    await checkRecieverEmail.merge({account_balance : newRecieverBal}).save();
                                    
                                    response.status(200);
                                    return {
                                        status : "success",
                                        amount : amount,
                                        email : email,
                                        message : `transfer successful`
                                    }
                                } catch(err){
                                    response.status(500);

                                    return {
                                        status : "fail",
                                        message : "internal server error"
                                    }
                                }

                            } else {
                                return {
                                    status : "fail",
                                    message : "insufficient account"
                                }
                            }
                        } else {
                            response.status(400)
                            return {
                                status : "fail",
                                message : `can't transfer to non users`
                            }
                        }
                    } else {
                        response.status(400);
                        return {
                            status : "fail",
                            message : "incorrect password"
                        }
                    }
                } else{
                    response.status(400)
                    return {
                        status : "fail",
                        message : "invalid user id"
                    }
                }
            }
        } catch (err){
            console.log(err)
        }
    }

    public async beneficiary ({request,response,params} : HttpContextContract){
        try {
            const {account_number, bank,password} = request.body();

            const id = await Account.find(params.userId);

            if (account_number && bank && password){
                if (id !== null){

                    const userPassword = id?.$original.password;

                    if (await Hash.verify(userPassword, password)) {
                        await id.merge({account_number : account_number}).save();
                        await id.merge({bank : bank}).save();
                        return {
                            status : "success",
                            account_name : bank,
                            account_number : account_number,
                            message : "successfully added beneficiary"
                        }
                      } else {
                          response.status(400);
                          return {
                              status : "fail",
                              message : "incorrect password"
                          }
                      }
                } else {
                    return {
                        status : "fail",
                        message : "user not found"
                    }
                }
            }
        } catch (err){
            console.log(err)
        }
    }

    public async withdrawal ({request,response,params} :  HttpContextContract){

        const id = await Account.find(params.userId);

        const {amount, password} = request.body();

        if(id !== null){
            const userPassword = id?.$original.password;

            const userName = id?.$original.name;

            if(amount && password){
                
                if (await Hash.verify(userPassword, password)){

                    const userBalance = id?.$original.account_balance ;

                    if (userBalance > amount) {
                        const userAccount = id?.$original.account_number ;

                        const userBank = id?.$original.bank ;

                        const userEmail = id?.$original.email ;
    
                        if (userAccount !== null){
                            const paystack = await paystackTransferHandler(userName, userAccount,userBank, amount);

                            if(paystack){
                                return {
                                    status : "success",
                                    account : userAccount,
                                    email : userEmail,
                                    amount : amount,
                                    message : "transaction pending"
                                }
                            } else{
                                response.status(400);
                                return{
                                    status : "fail",
                                    message : "could not resolve account"
                                }
                            }

                        } else {
                            response.status(400);
                            return {
                                status : "fail",
                                message : "user beneficiary account not found"
                            }
                        }
                    }else {
                        response.status(400);
                        return {
                            status : "fail",
                            message : "insufficient account balance"
                        }
                    }
                    

                } else {
                    response.status(400);
                    return {
                        status : "fail",
                        message : "Incorrect password"
                    }
                }
            } else{
                response.status(400);
                return {
                    status : "fail",
                    message : "amount and password required"
                }
            }
        } else {
            response.status(400);
            return {
                status : "fail",
                message : "user not found"
            }
        }
    }

    public async notification ({request,response}: HttpContextContract){
        const event = request.body().event

        if(event == "transfer.success"){
            const userName = request.body().data.recipient.name
            const amount = request.body().data.amount
            const userData = await Account
            .query()
            .where('name', userName)
            .orWhereNull('name')
            .first();
            const userBalance =  userData?.$original.account_balance
             
            const newBalance = parseInt(userBalance) - parseInt(amount) ;

            await userData?.merge({account_balance : newBalance}).save();
            response.status(200)
        }

        if(event == "charge.success"){
            response.status(200)
            const userEmail = request.body().data.customer.email
            console.log(request.body().data);
            const userData = await Account
            .query()
            .where('email', userEmail)
            .orWhereNull('email')
            .first();
            const amount = request.body().data.amount

            const userBalance =  userData?.$original.account_balance ; 

            const newBalance = parseInt(userBalance) + parseInt(amount) ;

            await userData?.merge({account_balance : newBalance}).save();

        }
        
    }
}
