function validateAndRemoveSerial(serial, serials) {
    const index = serials.indexOf(serial);
    if (index > -1) {
        serials.splice(index, 1);
        return true; // Serial number found and removed
    }
    return false; // Serial number not found
}

module.exports = { validateAndRemoveSerial };