// controllers/admin.js (or add to wallet controller)
const User = require("../models/user");
const RechargeRequest = require("../models/rechargeRequest");

const getAllUsers = async (req, res) => {
    const { search, page = 1, limit = 10 } = req.query;
    const query = {};
    if (search) {
        query.$or = [
            { username: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
        ];
    }
    try {
        const users = await User.find(query)
            .select("-password")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));
        const total = await User.countDocuments(query);
        res.json({ users, total, page: parseInt(page), pages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

const getRevenue = async (req, res) => {
    try {
        // Sum all approved recharge request amounts (or sum credit transactions with reason 'credit recharge')
        const result = await RechargeRequest.aggregate([
            { $match: { status: "approved" } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);
        const totalRevenue = result[0]?.total || 0;
        res.json({ totalRevenue });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

module.exports = {
    getAllUsers,
    getRevenue,

};
