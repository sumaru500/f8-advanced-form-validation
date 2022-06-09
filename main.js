import Validator from "./validator.js";

const formValidator = new Validator({
    form: '#form-1',
    errorSelector: '.form-message',
    groupSelector: '.form-group',
});

formValidator['onSubmit'] = function (data) {
    console.log("Call API here");
    console.log(data);
}