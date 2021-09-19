import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import Hash from '@ioc:Adonis/Core/Hash';
import Account from 'App/Models/Account';
import forge from 'node-forge';
import axios from 'axios';







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
                    const headers = {
                        'Authorization' : 'Bearer sk_test_06369f111627527b9733d9b46ee3748ba926bd15',
                        'Content-Type': 'application/json'
                    };
                    const bankDetail = {
                        email : userEmail,
                        amount : amount,
                        bank :{
                            code : bank,
                            account_number : account_number
                        },
                        birthday: "1995-12-23"
                    }

                    try {
                        const paystackResponse = await axios.post('https://api.paystack.co/charge',bankDetail,{headers});

                        if (paystackResponse.data.status === true){
                            const trx_ref = paystackResponse.data.data.reference;
                            const submitOtp =  {
                                otp : otp,
                                reference : trx_ref
                            }
    
                            const otpResponse = await axios.post('https://api.paystack.co/charge/submit_otp', submitOtp, {headers});
                            console.log(otpResponse);
    
                            const finalResponse = await axios.post('https://api.paystack.co/charge/submit_otp', submitOtp, {headers});
    
                            if(finalResponse.data.data.gateway_response){
                                console.log(finalResponse.data);
                                
                                const fundedAmount = finalResponse.data.data.amount ;
                                const fundedEmail = finalResponse.data.data.customer.email ;
                                const acctBalance = id?.$original.account_balance
                                const newBalance = parseInt(acctBalance) + parseInt(fundedAmount) 

                                await id.merge({account_balance : newBalance}).save()
                                
                                response.status(200);
                                return {
                                    status : "success",
                                    amount : fundedAmount,
                                    email : fundedEmail,
                                    message : "successfully funded your account"
                                }
                            }
                            
                        }else {
                            response.status(400)
                            return {
                                status : "fail",
                                message : "invalid bank info"
                            }
                        }
                    }catch (err){
                        response.status(400);

                        return {
                            status : "fail",
                            message : "invalid bank detail, use provided test bank"
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
    
                        if (userAccount){
                            
                            const userData = {
                               type : "nuban",
                               name : userName,
                               account_number : userAccount,
                               bank_code : userBank,
                               currency : "NGN"
                            }
                            
                            
                            const headers = {
                                'Authorization' : 'Bearer sk_test_06369f111627527b9733d9b46ee3748ba926bd15',
                                'Content-Type': 'application/json'
                            };
    
                            
                            try{
                                const paystackResponse = await axios.post('https://api.paystack.co/transferrecipient',userData,{headers});
                                
                                const recipientId = paystackResponse.data.data.recipient_code ;
                                const transferData = {
                                    source: "balance", 
                                    reason: "withdrawal", 
                                    amount : amount, 
                                    recipient : recipientId
        
                                }
                                try {
                                    await axios.post('https://api.paystack.co/transfer',transferData,{headers});
    
                                    const newBalance = parseInt(userBalance) - parseInt(amount) ;

                                    await id.merge({account_balance : newBalance}).save();

                                    response.status(200);
                                    return {
                                        status : "success",
                                        account : userAccount,
                                        email : userEmail,
                                        message : "successful withdrawal"
                                    }
                                    
                                } catch (err) {
                                    response.status(500);
                                    return {
                                        status : "fail",
                                        message : "withdrawal not successful"
                                    }
                                }

                            } catch (err){
                                response.status(400);
                                return {
                                    status : "fail",
                                    message : "could not validate account. add test account as beneficiary"
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
}
