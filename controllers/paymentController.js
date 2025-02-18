const Razorpay = require('razorpay');
const {RAZORPAY_ID_KEY , RAZORPAY_SECRET_KEY} = process.env;

console.log('Razorpay Key ID:', RAZORPAY_ID_KEY); // Debugging line
console.log('Razorpay Secret Key:', RAZORPAY_SECRET_KEY); // Debugging line

const razorpayInstance = new Razorpay({
    key_id: 'rzp_test_5foUVb3KuKkoeQ',
    key_secret: 'APYxWo4kIPOlQxjG1X1u6pq2'
});

const renderProductPage = async(req,res)=>{

    try{
        res.render('accounts2');
    }catch(err){
        console.log(error.message);
    }
}

const createOrder = async(req,res)=>{
    try{
        const amount = 800*100
        const options = {
            amount: amount,
            currency: 'INR',
            receipt: 'hetavimodi29@gmail.com'
        }

        razorpayInstance.orders.create(options,
            (err,order)=>{
                if(!err){
                    res.status(200).send({
                        success:true,
                        msg: 'Order Creater',
                        order_id: order.id,
                        amount: amount,
                        key_id: RAZORPAY_ID_KEY,
                        contact: req.body.student_ph_no,
                        name: req.body.name,
                        email: req.body.email
                    });
                }
                else{
                    res.status(400).send({success: false, msg: 'Something went wrong!'});
                }
            }
        );
    }catch(error){
        console.log(error.message);
    }
}

module.exports = {
    renderProductPage,
    createOrder
}