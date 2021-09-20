import axios from 'axios' ;
const headers = {
    'Authorization' : 'Bearer sk_test_06369f111627527b9733d9b46ee3748ba926bd15',
    'Content-Type': 'application/json'
};
const paystackFundHandler = async (requestData, otp)=>{
    try {
        const paystackResponse = await axios.post('https://api.paystack.co/charge',requestData,{headers});

        if (paystackResponse.data.status === true){
            const trx_ref = paystackResponse.data.data.reference;
            const submitOtp =  {
                otp : otp,
                reference : trx_ref
            }

            await axios.post('https://api.paystack.co/charge/submit_otp', submitOtp, {headers});
            // console.log(otpResponse);

            const finalResponse = await axios.post('https://api.paystack.co/charge/submit_otp', submitOtp, {headers});
            
            if(finalResponse.data.data.gateway_response){

                return finalResponse.data 
            }
            
        }else {
            return false
        }
    }catch (err){
        return false
    }
}

const paystackTransferHandler = async (userName,userAccount,userBank,amount)=>{
    try{
        const userData = {
            type : "nuban",
            name : userName,
            account_number : userAccount,
            bank_code : userBank,
            currency : "NGN"
         }
        const paystackResponse = await axios.post('https://api.paystack.co/transferrecipient',userData,{headers});
        
        const recipientId = paystackResponse.data.data.recipient_code ;
        const transferData = {
            source: "balance", 
            reason: "withdrawal", 
            amount : amount, 
            recipient : recipientId

        }
        try {

            const transferResponse = await axios.post('https://api.paystack.co/transfer',transferData,{headers});

            return transferResponse.data
            
        } catch (err) {
            console.log(err.data)
        }

        
    } catch (err){
        console.log(err.data)
    }
}

export {paystackFundHandler, paystackTransferHandler} ;