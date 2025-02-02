const express = require('express');
const Complaint = require('../models/Complaint');
const router = express.Router();
const { ensureAuthenticated, ensureAdmin } = require('../middlewares/auth');
const { roles } = require('../utils/constants');


router.get('/add', ensureAuthenticated, (req, res) => {
    res.render('add-complaint');
});

// ✅ 1. User submits a complaint
router.post('/add', ensureAuthenticated, async (req, res) => {
    try {
        const { roomNo, mobileNo, rollNo, title, description } = req.body;
        const newComplaint = new Complaint({
            roomNo,
            mobileNo,
            rollNo,
            title,
            description,
            status: 'Pending', // Default status
            user: req.user._id, // Assuming you're storing user info in session
        });
        await newComplaint.save();
        req.flash('success', 'Complaint submitted successfully');
        res.redirect('/complaints/my-complaints'); // Redirect to user's complaints
    } catch (error) {
        console.error(error);
        req.flash('error', 'Failed to submit complaint');
        res.redirect('/');
    }
});

// ✅ 2. User can view only their complaints
// ✅ 2. User can view only their complaints (with limited fields)
router.get('/my-complaints', ensureAuthenticated, async (req, res) => {
    try {
        const complaints = await Complaint.find({ user: req.user._id })
            .select('title description status'); // Only select title, description, and status
        res.render('my-complaints', { complaints });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});


// ✅ 3. Admin can view all complaints (with all fields)
// ✅ Admin can view only pending & in-progress complaints (exclude resolved)
router.get('/all', ensureAuthenticated, async (req, res) => {
    console.log('Entered /all route');  // Debug: Check if route is accessed

    const roleHostelMap = {
        [roles.admin1]: 1,
        [roles.admin2]: 2,
        [roles.admin3]: 3,
        [roles.admin4]: 4
    };

    console.log('User Role:', req.user.role);  // Debug: Check user's role

    if (!roleHostelMap.hasOwnProperty(req.user.role)) {
        console.log('Unauthorized access attempt');  // Debug: Unauthorized access
        req.flash('error', 'Unauthorized Access');
        return res.redirect('/');
    }

    try {
        const assignedHostelNo = roleHostelMap[req.user.role];
        console.log('Assigned Hostel No:', assignedHostelNo);  // Debug: Check assigned hostel number

        // Populate user field and filter by hostelNumber (use consistent field name)
        const complaints = await Complaint.find({ status: { $ne: 'Resolved' } })
            .populate({
                path: 'user',
                select: 'name email hostelNumber', // Match the correct field name
                match: { hostelNumber: assignedHostelNo } // Filter by hostelNumber
            });

        console.log('Complaints fetched:', complaints.length);  // Debug: Check how many complaints fetched

        // Filter complaints to exclude those without a valid user (null user field)
        const filteredComplaints = complaints.filter(complaint => complaint.user !== null);
        console.log('Filtered Complaints:', filteredComplaints.length);  // Debug: Check after filtering

        res.render('all-complaints', { complaints: filteredComplaints });
    } catch (error) {
        console.error('Error in fetching complaints:', error);
        res.status(500).send('Server Error');
    }
});



router.get('/resolved', ensureAuthenticated, ensureAdmin, async (req, res) => {
    // Map admin roles to hostel numbers
    console.log('at resolved page')
    const roleHostelMap = {
        [roles.admin1]: 1,
        [roles.admin2]: 2,
        [roles.admin3]: 3,
        [roles.admin4]: 4
    };

    // Check if user is an authorized admin
    if (req.user.role != roles.admin1 && req.user.role != roles.admin2 && req.user.role != roles.admin3 && req.user.role != roles.admin4)  {
        req.flash('error', 'Unauthorized Access');
        return res.redirect('/');
    }

    try {
        // Get the hostel number assigned to the logged-in admin
        const assignedHostelNo = roleHostelMap[req.user.role];

        // Find resolved complaints where the user's hostelNo matches the admin's assigned hostel
        const complaints = await Complaint.find({ status: 'Resolved' })
            .populate({
                path: 'user',
                select: 'name email hostelNumber',
                match: { hostelNumber: assignedHostelNo }  // Filter complaints by hostelNo
            });

        // Filter out complaints where the user didn't match (null users)
        const filteredComplaints = complaints.filter(complaint => complaint.user !== null);

        res.render('resolved-complaints', { complaints: filteredComplaints });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching resolved complaints');
    }
});



// POST route to update the complaint status
router.post('/update-status', ensureAuthenticated, ensureAdmin, async (req, res) => {
    try {
        const { complaintId, status } = req.body;

        // Ensure the complaint exists and fetch associated user's hostelNo
        const complaint = await Complaint.findById(complaintId).populate('user', 'hostelNumber');
        if (!complaint) {
            console.log('i am inside !complaint if')
            req.flash('error', 'Complaint not found');
            return res.redirect('/complaints/all');
        }

        // Map admin roles to hostel numbers
        const roleHostelMap = {
            [roles.admin1]: 1,
            [roles.admin2]: 2,
            [roles.admin3]: 3,
            [roles.admin4]: 4
        };

        // Check if the user is an authorized admin
        if (!roleHostelMap.hasOwnProperty(req.user.role)) {
            console.log('Now i am inside !roleHostelMap.hasOwnProperty')
            req.flash('error', 'Unauthorized Access');
            return res.redirect('/complaints/all');
        }

        const assignedHostelNo = roleHostelMap[req.user.role];
        console.log(complaint.user.hostelNumber);
        // Check if the complaint belongs to the admin's assigned hostel
        if (complaint.user.hostelNumber !== assignedHostelNo) {
            console.log('Now i am inside complaint.user.hostelNo !== assignedHostelNo')
            req.flash('error', 'Unauthorized to update this complaint');
            return res.redirect('/complaints/all');
        }

        // Update the status if authorized
        complaint.status = status;
        await complaint.save();

        req.flash('success', 'Complaint status updated successfully');
        res.redirect('/complaints/all'); // Redirect back to complaints list
    } catch (error) {
        console.error(error);
        req.flash('error', 'Something went wrong');
        res.redirect('/complaints/all');
    }
});



module.exports = router;
