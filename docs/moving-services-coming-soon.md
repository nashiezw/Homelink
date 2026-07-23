# HouseLink Moving Services Module

Status: Coming Soon / Future Module

This document captures the proposed HouseLink Moving Services system for later implementation. It should not be treated as live platform functionality yet.

## Product Rationale

Moving services could become a strong HouseLink differentiator because it extends the property journey beyond finding a home into the relocation experience. Customers who rent, buy, or move between properties could book trusted movers directly through HouseLink, while admins manage driver approvals, vehicle compliance, pricing, bookings, payments, and service quality.

## Core Concept

Create a complete HouseLink Moving Services system integrated into the HouseLink platform. The system should be fully responsive and fully manageable from the Admin Dashboard.

## Driver Registration

Drivers can apply to become HouseLink Movers.

Required information:

- Full name
- Phone number
- Email
- National ID number
- Date of birth
- Residential address
- City
- Driver's licence number
- Licence expiry date
- Front of licence upload
- Back of licence upload
- National ID upload, front and back
- Selfie/profile photo
- Emergency contact
- Bank, EcoCash, or Innbucks payment details

Application statuses:

- Pending
- Approved
- Rejected
- Suspended

Drivers cannot receive bookings until approved by an administrator.

## Vehicle Registration

Drivers can register one or multiple vehicles.

For each vehicle collect:

- Vehicle name
- Registration number
- Make
- Model
- Year
- Colour
- Truck type
- Payload capacity in kg
- Cargo dimensions
- Approximate house size supported
- Tail lift available
- Can carry furniture
- Can carry appliances

Required vehicle uploads:

- Front photo
- Rear photo
- Side photo
- Interior cargo photo

Vehicle statuses:

- Pending approval
- Approved
- Suspended

## Required Documents

Admin can define required verification documents.

Examples:

- Driver's licence
- National ID
- Vehicle registration book
- Vehicle insurance
- Roadworthy certificate
- Police clearance, optional

The system should alert drivers before documents expire.

## Customer Booking

Customer enters:

- Pickup address
- Destination address
- Preferred date
- Preferred time
- Property type
- Number of floors
- Whether a lift is available
- Estimated house size
- Items to move
- Special items
- Photos
- Additional notes

## Furniture Checklist

Allow customers to select:

- Bedroom
- Living room
- Kitchen
- Office
- Outdoor
- Boxes
- Appliances
- Fragile items
- Custom items

Display estimated space required.

## Truck Recommendation

Based on selected furniture, recommend:

- Small pickup
- 1-ton truck
- 3-ton truck
- 5-ton truck
- Large removal truck

Warn customers if the selected truck appears too small.

## Driver Availability

Drivers maintain a calendar.

They can:

- Accept bookings
- Reject bookings
- Mark unavailable dates
- Pause their account
- Go offline
- Go online

## Booking Workflow

1. Booking created
2. Searching for drivers
3. Driver accepts
4. Customer confirms
5. Moving in progress
6. Completed
7. Customer rates driver

## GPS And Tracking

Display:

- Driver location
- Estimated arrival
- Pickup location
- Destination
- Trip status

Admin can track every active move.

## Ratings And Reviews

Customers rate:

- Punctuality
- Care of furniture
- Professionalism
- Communication
- Overall rating

Only completed bookings can be reviewed.

## Pricing

Admin chooses pricing model.

Examples:

- Distance based
- Truck size
- Hourly
- Flat rate
- Manual quote
- HouseLink commission

Drivers receive estimated earnings before accepting.

## Payments

Support:

- Cash
- EcoCash
- Bank transfer
- Online payment

Customer pays HouseLink.

HouseLink automatically calculates:

- Driver earnings
- HouseLink commission
- Outstanding balance

## Admin Dashboard

Admin can:

- Approve drivers
- Reject drivers
- Suspend drivers
- Approve vehicles
- Approve documents
- View all bookings
- View revenue
- View driver earnings
- View reviews
- View complaints
- Manage pricing
- Manage truck categories
- Manage moving services
- View analytics
- Export reports

## Notifications

Automatic SMS, email, and WhatsApp notifications for:

- Booking created
- Driver assigned
- Driver accepted
- Driver arrived
- Trip started
- Trip completed
- Payment received
- Document expiry reminder

## Customer Dashboard

Customers can:

- View upcoming moves
- Track driver
- Download invoice
- Rate driver
- Book again
- View booking history
- Cancel booking

## Driver Dashboard

Drivers can:

- Manage vehicles
- Upload documents
- Update availability
- Accept jobs
- Reject jobs
- View earnings
- Withdraw earnings, if applicable
- View reviews

## Admin Analytics

Show:

- Total drivers
- Verified drivers
- Pending applications
- Active trucks
- Completed moves
- Cancelled moves
- Monthly revenue
- Average ratings
- Most popular truck
- Most active driver

## Security And Audit Logging

Every action must be logged.

Store:

- Who approved a driver
- Who rejected a driver
- Who edited pricing
- Who cancelled bookings
- Document verification history

## Additional Recommendations

Drivers could register optional crew members, loaders, or helpers.

Customers could choose:

- Driver only
- Driver plus 1 helper
- Driver plus 2 helpers
- Driver plus full moving team

Customers could also request moving supplies:

- Cardboard boxes
- Bubble wrap
- Packing tape
- Mattress covers
- Furniture blankets

An AI move estimator could ask a few simple questions, such as house size, furniture, and photos, then recommend the right truck and crew size automatically. This would reduce booking errors and improve the customer experience.

## Customer Experience Enhancements

Add these features to make the moving module more useful and competitive:

- Instant price estimates before booking
- Multiple quotes from different approved drivers
- Real-time job tracking from driver assignment to completion
- Optional helpers or loaders
- Insurance options for higher-value moves
- Photo uploads of items to be moved
- Booking history and downloadable invoices
- Customer and driver ratings
- In-app chat between the customer and the assigned driver

## Suggested Rollout

Phase 1: Coming Soon page and lead capture.

Phase 2: Admin-managed driver applications and vehicle approvals.

Phase 3: Customer booking requests and manual quote workflow.

Phase 4: Driver dashboard, availability, acceptance flow, and earnings.

Phase 5: Payments, tracking, reviews, analytics, notifications, and AI estimator.
