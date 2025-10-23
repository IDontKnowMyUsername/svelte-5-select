export function getItemProperty(item, key) {
    return item && typeof item === 'object' ? item[key] : undefined;
}
export function areItemsEqual(a, b, itemId) {
    if (!a || !b)
        return false;
    return getItemProperty(a, itemId) === getItemProperty(b, itemId);
}
export function isCancelled(res) {
    return res && typeof res === 'object' && 'cancelled' in res && res.cancelled === true;
}
export function isStringArray(arr) {
    return arr.length > 0 && arr.every(item => typeof item === 'string');
}
export function isItemSelectableCheck(item) {
    if (!item)
        return false;
    return !item.hasOwnProperty('selectable') || item.selectable !== false;
}
export function hasValueChanged(newValue, oldValue) {
    return JSON.stringify(newValue) !== JSON.stringify(oldValue);
}
export function createGroupHeaderItem(groupValue, item, labelKey = 'label') {
    return {
        value: groupValue,
        [labelKey]: groupValue,
    };
}
