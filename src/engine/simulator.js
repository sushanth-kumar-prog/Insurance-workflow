const { adjudicateClaim } = require('./adjudicator');
const { detectFraudAndAnomalies, detectMissingDocuments } = require('./fraudDetector');

function simulateClaim(claimDraft, policyDetails) {
    const adjudicationResult = adjudicateClaim(claimDraft, policyDetails);

    const fraudFlags = detectFraudAndAnomalies(claimDraft, policyDetails);
    const documentWarnings = detectMissingDocuments(claimDraft);

    return {
        ...adjudicationResult,
        missingDocumentFlags: documentWarnings,
        fraudFlags: fraudFlags
    };
}

module.exports = {
    simulateClaim
};
