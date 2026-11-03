const getHealth= (req, res) =>{
    res.status(200).json({
        message: "FixFlow API is running"
    })
};
module.exports=getHealth;