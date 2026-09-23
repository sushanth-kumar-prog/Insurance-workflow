const { body, validationResult } = require('express-validator');

const validateSimulator = [
    body('policyDetails').isObject().withMessage('policyDetails must be an object'),
    body('policyDetails.sumInsuredBalance').isNumeric().custom(val => val >= 0).withMessage('sumInsuredBalance must be numeric and >= 0'),
    body('policyDetails.waitingPeriodMonths').isNumeric().withMessage('waitingPeriodMonths must be numeric'),

    body('claimDraft').isObject().withMessage('claimDraft must be an object'),
    body('claimDraft.billItems').isArray({ min: 1 }).withMessage('billItems must be a non-empty array'),
    body('claimDraft.billItems.*.itemCode').isString().notEmpty().withMessage('Each bill item must have an itemCode'),
    body('claimDraft.billItems.*.description').isString().notEmpty().withMessage('Each bill item must have a description'),
    body('claimDraft.billItems.*.billedAmount').isNumeric().custom(val => val > 0).withMessage('billedAmount must be > 0'),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ status: 'error', errors: errors.array() });
        }
        next();
    }
];

module.exports = validateSimulator;
