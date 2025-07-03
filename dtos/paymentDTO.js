const formatPaymentStatusDto = (paymentStatus) => {
    return {
        year: paymentStatus.year,
        months: Object.fromEntries(paymentStatus.months),
        quarters: Object.fromEntries(paymentStatus.quarters)
    };
};

const formatStudentPaymentDetails = (users, paymentStatuses, year, currentMonth, currentQuarter) => {
    const formattedPayments = [];

    users.forEach(user => {
        if (!user || !user._id) {
            console.warn('Skipping user with invalid _id:', user);
            return;
        }

        const paymentStatus = paymentStatuses.find(
            status => status.userId?.toString() === user._id.toString()
        );

        const monthStatuses = Array(12).fill('Pending');
        const quarterStatuses = Array(4).fill('Pending');

        if (paymentStatus) {
            if (paymentStatus.months) {
                Object.entries(paymentStatus.months).forEach(([monthIndex, status]) => {
                    const index = parseInt(monthIndex);
                    if (!isNaN(index) && index >= 0 && index < 12) {
                        monthStatuses[index] = status;
                    }
                });
            }

            if (paymentStatus.quarters) {
                Object.entries(paymentStatus.quarters).forEach(([quarterIndex, status]) => {
                    const index = parseInt(quarterIndex) - 1;
                    if (!isNaN(index) && index >= 0 && index < 4) {
                        quarterStatuses[index] = status;
                    }
                });
            }
        }

        // Monthly Payments - up to current month
        for (let i = 0; i <= currentMonth; i++) {
            const status = monthStatuses[i];
            const monthName = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
            ][i];

            formattedPayments.push({
                studentName: user.name || 'Unknown',
                studentEmail: user.email || 'N/A',
                paymentType: 'Monthly',
                period: `${monthName} ${year}`,
                year,
                status
            });
        }

        // Quarterly Payments - up to current quarter
        for (let i = 0; i < currentQuarter; i++) {
            const status = quarterStatuses[i];
            formattedPayments.push({
                studentName: user.name || 'Unknown',
                studentEmail: user.email || 'N/A',
                paymentType: 'Quarterly',
                period: `Q${i + 1} ${year}`,
                year,
                status
            });
        }
    });

    return formattedPayments;
};


module.exports = {
    formatPaymentStatusDto,
    formatStudentPaymentDetails
};