export default function Validator(options = {}) {
  // binding Validator object in ES5
  const _this = this;
  /**
   * rules' implementation
   *   Rules definitions
   * Rule common defintion:
   * 1. If error then return error message
   * 2. If ok then return undefined or no return
   */

  const RULES = {
    required(value, errorMessage = 'Please enter a value') {
      if (typeof value === 'string') {
        value = value.trim();
      } // else means a boolean
      return value ? undefined : errorMessage;
    },
    email(value, errorMessage = 'Please enter a valid email') {
      return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(value)
        ? undefined
        : errorMessage;
    },
    min(min) {
      return (
        value,
        errorMessage = `Please anter at least ${min} characters`
      ) => {
        return value.length >= Number(min) ? undefined : errorMessage;
      };
    },
    confirmation(getConfirmationValue) {
      return (
        value,
        errorMessage = `Please enter the same confirmation value`
      ) => {
        return value === getConfirmationValue() ? undefined : errorMessage;
      };
    },
  };

  /**
   *
   * @param {to be validated element} inputElement
   * @param {rule applied to valide the given element} rule
   */
  function validate(inputElement, rules) {
    let errorMessage;
    for (let rule of rules) {
      let groupElement = inputElement.closest(options.groupSelector);
      let errorElement = groupElement.querySelector(options.errorSelector);

      errorMessage = rule(
        ['checkbox', 'radio'].includes(inputElement.type)
          ? groupElement.querySelector(`[name=${inputElement.name}]:checked`)?.value
          : inputElement.value
      );

      if (errorMessage) {
        addInvalid(groupElement, errorElement, errorMessage);
        break;
      } else {
        removeInvalid(groupElement, errorElement);
      }
    }

    return !!!errorMessage;
  }

  function removeInvalid(groupElement, errorElement) {
    groupElement.classList.remove('invalid');
    errorElement.innerText = '';
  }

  function addInvalid(groupElement, errorElement, errorMessage) {
    groupElement.classList.add('invalid');
    errorElement.innerText = errorMessage;
  }

  // ----------------------------------------------------------------//
  console.log(options);

  let formElement = document.querySelector(options.form);

  if (formElement) {
    // get all input having name and rules
    let allInputElements = document.querySelectorAll('[name][rules]');

    let selectorRules = {};

    // collect rules for each input
    allInputElements.forEach((inputElement) => {
      if (Array.isArray(selectorRules[inputElement.name])) {
        selectorRules[inputElement.name].push(
          inputElement.getAttribute('rules')
        );
      } else {
        // first time => init array with the first rule of that selector
        selectorRules[inputElement.name] = [inputElement.getAttribute('rules')];
      }
    });

    // post-processing selectorRules to map with rule functions
    // 0. Decompose composite rules
    // 1. remove duplicated rules in the same selector if exists
    // 2. mapping to rule functions
    for (const selector in selectorRules) {
      if (selectorRules.hasOwnProperty(selector)) {
        let ruleNames = selectorRules[selector];

        // 0. Decompose rules
        ruleNames = ruleNames.reduce((acc, ruleName) => {
          ruleName.split('|').forEach((singleRule) => {
            acc.push(singleRule);
          });
          return acc;
        }, []);

        // 1. Remove duplicated
        ruleNames = [...new Set(ruleNames)];

        // 2. Map to functions
        const ruleFns = ruleNames.map((ruleName) => {
          // IMPORTANT: process rule name with param, e.g. min:6, max:10
          // with these rules we must invoke the higher order rule function
          // to return the lower order function configured with the param (see closure)
          let [fnName, ...params] = ruleName.split(':');
          if (params.length >= 1) {
            // pre-process reference params
            let processedParams = params.reduce((acc, param) => {
              if (param.startsWith('#')) {
                // make getter function instead of a value param
                const refElement = formElement.querySelector(param);
                if (refElement) {
                  acc.push(() => {
                    return refElement.value;
                  });
                }
              } else {
                acc.push(param);
              }
              return acc;
            }, []);

            return RULES[fnName](...processedParams);
          }
          return RULES[fnName];
        });

        // finally, re-assign
        selectorRules[selector] = ruleFns;
      }
    }

    console.log(selectorRules);

    // subcribe validate event for each selector
    for (let selector in selectorRules) {
      let inputElements = formElement.querySelectorAll(`[name=${selector}]`);

      inputElements.forEach((inputElement) => {
        if (inputElement) {
          // blur event
          inputElement.onblur = function () {
            validate(this, selectorRules[selector]);
          };

          // on input event
          inputElement.oninput = function () {
            let groupElement = inputElement.closest(options.groupSelector);
            let errorElement = groupElement.querySelector(
              options.errorSelector
            );
            removeInvalid(groupElement, errorElement);
          };
        }
      });
    }

    // cancel the default behavior submit event on form and validate form
    formElement.onsubmit = function (event) {
      event.preventDefault();

      let isFormValid = true;
      for (let selector in selectorRules) {
        let inputElements = this.querySelectorAll(`[name=${selector}]`);
        inputElements.forEach((inputElement) => {
          isFormValid &= validate(inputElement, selectorRules[selector]);
        });
      }

      // continue submit with a call back if form is validated
      if (isFormValid) {
        // submit with validate config
        if (typeof _this.onSubmit === 'function') {
          let enablesInputs = this.querySelectorAll('[name]:not([disabled])');

          // collect values of fields, name is required
          let data = {};
          // enablesInputs.forEach(input => {
          //     data[input.name] = input.value;
          // });

          // an alternative way to collect data
          data = Array.from(enablesInputs).reduce((obj, input) => {
            switch (input.type) {
              case 'checkbox':
                // pre-condition : do nothing but assign empty array
                if (!input.checked) {
                  !obj[input.name] && (obj[input.name] = []);
                  return obj;
                }
                // checkbox
                if (!Array.isArray(obj[input.name])) {
                  obj[input.name] = [input.value];
                } else {
                  obj[input.name].push(input.value);
                }
                break;
              case 'radio':
                // pre-condition : do nothing but assign empty
                if (!input.checked) {
                  !obj[input.name] && (obj[input.name] = '');
                  return obj;
                }
                obj[input.name] = input.value;
                break;
              case 'file':
                obj[input.name] = input.files;
                break;
              default:
                obj[input.name] = input.value;
            }
            return obj;
          }, {});

          // submit
          _this.onSubmit(data);
        }
        //  submit with default behavior
        else {
          this.submit();
        }
      }
    };
  }
}
