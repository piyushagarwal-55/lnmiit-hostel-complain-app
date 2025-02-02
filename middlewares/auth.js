const { roles } = require("../utils/constants");


function ensureAuthenticated(req, res, next) {
    console.log('Inside ensureAuthenticated middleware');
    if (req.isAuthenticated()) {
        return next();
    }
    req.flash('error', 'Please log in to view that resource');
    res.redirect('/login');
}

function ensureAdmin(req, res, next) {
    console.log('User Role inside ensureAdmin:', req.user.role); // Debugging log

    // Check if the user is an authorized admin
    if (req.user.role !== roles.admin1 && req.user.role !== roles.admin2 && req.user.role !== roles.admin3 && req.user.role !== roles.admin4) {
        req.flash('error', 'Unauthorized Access');
        return res.redirect('/');
    }
    next(); // Proceed to the next middleware/route handler if the user is authorized
}


module.exports = { ensureAuthenticated, ensureAdmin };

