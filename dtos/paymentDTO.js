const formatPaymentStatusDto = (paymentStatus) => {
    return {
        year: paymentStatus.year,
        months: paymentStatus.months || {},
        quarters: paymentStatus.quarters || {},
        halfYearly: paymentStatus.halfyearly || {}
    };
};

const formatStudentPaymentDetails = (users, paymentStatuses, year, currentMonth, currentQuarter) => {
    const formattedPayments = [];

    users.forEach(user => {
        if (!user || !user.id) {
            console.warn('Skipping user with invalid id:', user);
            return;
        }

        const paymentStatus = paymentStatuses.find(
            status => status.userid === user.id
        );

        const monthStatuses = Array(12).fill('Pending');
        const quarterStatuses = Array(4).fill('Pending');
        const halfYearStatuses = Array(2).fill('Pending');

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

            if (paymentStatus.halfyearly) {
                if (paymentStatus.halfyearly.half1) {
                    halfYearStatuses[0] = paymentStatus.halfyearly.half1;
                }
                if (paymentStatus.halfyearly.half2) {
                    halfYearStatuses[1] = paymentStatus.halfyearly.half2;
                }
            }
        }

        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        // Add monthly breakdown for each payment up to current month
        for (let i = 0; i <= currentMonth; i++) {
            const status = monthStatuses[i];
            const monthName = monthNames[i];

            formattedPayments.push({
                studentName: user.name || 'Unknown',
                studentEmail: user.email || 'N/A',
                paymentType: 'Monthly',
                period: `${monthName} ${year}`,
                year,
                status
            });
        }

        // Add quarterly summary rows up to current quarter
        for (let i = 0; i < currentQuarter; i++) {
            const quarterStatus = quarterStatuses[i];
            const startMonth = i * 3;
            const endMonth = startMonth + 2;
            
            // Only show if quarter is within current month range
            if (endMonth <= currentMonth) {
                const quarterMonths = [];
                for (let m = startMonth; m <= endMonth; m++) {
                    quarterMonths.push(monthNames[m]);
                }
                
                formattedPayments.push({
                    studentName: user.name || 'Unknown',
                    studentEmail: user.email || 'N/A',
                    paymentType: 'Quarterly',
                    period: `Q${i + 1} (${quarterMonths.join(', ')})`,
                    year,
                    status: quarterStatus
                });
            }
        }

        // Add half-yearly summary rows
        const currentHalf = Math.floor(currentMonth / 6) + 1;
        for (let i = 0; i < currentHalf; i++) {
            const halfStatus = halfYearStatuses[i];
            const startMonth = i * 6;
            const endMonth = Math.min(startMonth + 5, currentMonth);
            
            if (endMonth >= startMonth) {
                const halfMonths = [];
                for (let m = startMonth; m <= endMonth; m++) {
                    halfMonths.push(monthNames[m]);
                }
                
                formattedPayments.push({
                    studentName: user.name || 'Unknown',
                    studentEmail: user.email || 'N/A',
                    paymentType: 'Half-Yearly',
                    period: `H${i + 1} (${halfMonths.join(', ')})`,
                    year,
                    status: halfStatus
                });
            }
        }
    });

    return formattedPayments;
};


module.exports = {
    formatPaymentStatusDto,
    formatStudentPaymentDetails
};