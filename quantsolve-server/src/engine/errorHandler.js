// engine/errorHandler.js

function handleError(err) {
    return {
        success: false,
        error: err.message,
    };
}

module.exports = handleError;
