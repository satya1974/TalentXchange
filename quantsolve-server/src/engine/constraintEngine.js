// engine/constraintEngine.js

function checkConstraint(variable, value, constraints) {
    if (!constraints || !constraints[variable]) return true;

    const c = constraints[variable];

    if (c.min !== undefined && value < c.min) return false;
    if (c.max !== undefined && value > c.max) return false;

    if (c.even === true && value % 2 !== 0) return false;
    if (c.odd === true && value % 2 === 0) return false;

    return true;
}

module.exports = checkConstraint;
