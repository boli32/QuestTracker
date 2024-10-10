var QuestTracker = QuestTracker || (function () {
    'use strict';

    const styles = {
        menu: 'background-color: #fff; border: 1px solid #000; padding: 5px; border-radius: 5px; overflow: hidden;',
        button: 'background-color: #000; border: 1px solid #292929 ; border-radius: 3px; padding: 2px; color: #fff; text-align: center;',
        buttonDisabled: 'pointer-events: none; background-color: #666; border: 1px solid #292929; border-radius: 3px; padding: 2px; text-align: center; color: #000000;',
        smallButton: 'display: inline-block; width: 12px; height:16px;',
        smallButtonMagnifier: 'display: inline-block; width: 16px; height:16px; background-color:#fff;',
        smallButtonContainer: 'text-align:center; width: 20px; padding:1px',
        smallButtonAdd: 'text-align:right; width: 20px; padding:1px margin-right:1px',
        smallerText: 'font-size: smaller',
        list: 'list-style none; padding: 0; margin: 0; overflow: hidden;',
        label: 'float: left; font-weight: bold;',
        topBorder: 'border-top: 1px solid #ddd;',
        bottomBorder: 'border-bottom: 1px solid #ddd;',
        topMargin: 'margin-top: 20px;',
        column: 'overflow: hidden; padding: 5px 0;',
        marginRight: 'margin-right: 2px',
        floatLeft: 'float: left;',
        floatRight: 'float: right;',
        overflow: 'overflow: hidden; margin:1px',
        rumour: 'text-overflow: ellipsis;overflow: hidden;width: 165px;display: block;word-break: break-all;white-space: nowrap;',
        link: 'color: #007bff; text-decoration: underline; cursor: pointer;'
    };

    const statusMapping = {
        1: 'Unknown',
        2: 'Discovered',
        3: 'Started',
        4: 'Ongoing',
        5: 'Completed',
        6: 'Completed By Someone Else',
        7: 'Failed',
        8: 'Time ran out',
        9: 'Ignored'
    };

    let QUEST_TRACKER_currentDate = '1970-01-01';
    let QUEST_TRACKER_questsToAutoAdvance = []; 
    let QUEST_TRACKER_globalQuestData = {};
    let QUEST_TRACKER_globalQuestArray = [];
    let QUEST_TRACKER_generations = {};
    let QUEST_TRACKER_globalRumours = {};
    let QUEST_TRACKER_QuestHandoutName = "QuestTracker Quests";
    let QUEST_TRACKER_RumourHandoutName = "QuestTracker Rumours";
    let QUEST_TRACKER_rumoursByLocation = {};
    let QUEST_TRACKER_readableJSON = true;
    let QUEST_TRACKER_pageName = "Quest Tree Page";
    let QUEST_TRACKER_TreeObjRef = {};
    let QUEST_TRACKER_questGrid = [];

    const loadQuestTrackerData = () => {
        initializeQuestTrackerState();
        QUEST_TRACKER_globalQuestData = state.QUEST_TRACKER.globalQuestData;
        QUEST_TRACKER_globalQuestArray = state.QUEST_TRACKER.globalQuestArray;
        QUEST_TRACKER_globalRumours = state.QUEST_TRACKER.globalRumours;
        QUEST_TRACKER_currentDate = state.QUEST_TRACKER.currentDate || '1970-01-01';
        QUEST_TRACKER_questsToAutoAdvance = state.QUEST_TRACKER.questsToAutoAdvance;
        QUEST_TRACKER_rumoursByLocation = state.QUEST_TRACKER.rumoursByLocation;
        QUEST_TRACKER_generations = state.QUEST_TRACKER.generations || {};
        QUEST_TRACKER_readableJSON = state.QUEST_TRACKER.readableJSON || true;
        QUEST_TRACKER_TreeObjRef = state.QUEST_TRACKER.TreeObjRef || {};
        QUEST_TRACKER_questGrid = state.QUEST_TRACKER.questGrid || [];
    };

    const saveQuestTrackerData = () => {
        state.QUEST_TRACKER.globalQuestData = QUEST_TRACKER_globalQuestData;
        state.QUEST_TRACKER.globalQuestArray = QUEST_TRACKER_globalQuestArray;
        state.QUEST_TRACKER.globalRumours = QUEST_TRACKER_globalRumours;
        state.QUEST_TRACKER.currentDate = QUEST_TRACKER_currentDate;
        state.QUEST_TRACKER.questsToAutoAdvance = QUEST_TRACKER_questsToAutoAdvance;
        state.QUEST_TRACKER.rumoursByLocation = QUEST_TRACKER_rumoursByLocation;
        state.QUEST_TRACKER.generations = QUEST_TRACKER_generations;
        state.QUEST_TRACKER.readableJSON = QUEST_TRACKER_readableJSON;
        state.QUEST_TRACKER.questGrid = QUEST_TRACKER_questGrid;
    };

    const initializeQuestTrackerState = () => {
        if (!state.QUEST_TRACKER || Object.keys(state.QUEST_TRACKER).length === 0) {
            state.QUEST_TRACKER = {
                globalQuestData: {},
                globalQuestArray: [],
                globalRumours: {},
                currentDate: '1970-01-01',
                questsToAutoAdvance: [],
                rumoursByLocation: {},
                generations: {},
                readableJSON: true,
                QUEST_TRACKER_TreeObjRef: {}
            };
            if (!findObjs({ type: 'rollabletable', name: 'quests' })[0]) {
                createObj('rollabletable', { name: 'quests' });
            }
            let locationTable = findObjs({ type: 'rollabletable', name: 'locations' })[0];
            if (!locationTable) {
                locationTable = createObj('rollabletable', { name: 'locations' });
                createObj('tableitem', {
                    _rollabletableid: locationTable.id,
                    name: 'Everywhere',
                    weight: 1
                });
            }
            if (!findObjs({ type: 'handout', name: QUEST_TRACKER_QuestHandoutName })[0]) {
                createObj('handout', { name: QUEST_TRACKER_QuestHandoutName });
            }
            if (!findObjs({ type: 'handout', name: QUEST_TRACKER_RumourHandoutName })[0]) {
                createObj('handout', { name: QUEST_TRACKER_RumourHandoutName });
            }
            Utils.sendGMMessage("QuestTracker has been initialized.");
        }
    };

    const Utils = (() => {
        const sendGMMessage = (message) => {
            sendChat('Quest Tracker', `/w gm ${message}`);
        };

        const normalizeKeys = (obj) => {
            if (typeof obj !== 'object' || obj === null) return obj;
            if (Array.isArray(obj)) return obj.map(item => normalizeKeys(item));
            return Object.keys(obj).reduce((acc, key) => {
                const normalizedKey = key.toLowerCase();
                acc[normalizedKey] = normalizeKeys(obj[key]);
                return acc;
            }, {});
        };

        const stripJSONContent = (content) => {
            content = content
                .replace(/<br>/gi, '')
                .replace(/<\/?[^>]+(>|$)/g, '')
                .replace(/&nbsp;/gi, ' ')
                .replace(/&[a-z]+;/gi, ' ')
                .replace(/\+/g, '')
                .replace(/[\r\n]+/g, ' ')
                .replace(/\s{2,}/g, ' ')
                .trim();

            const start = content.indexOf('{');
            const end = content.lastIndexOf('}');

            if (start === -1 || end === -1) {
                log('Error 01-03-01: Valid JSON structure not found after stripping.');
                return '{}';
            }

            const jsonContent = content.substring(start, end + 1).trim();
            return jsonContent;
        };
        

        const checkType = (input) => {
            if (typeof input === 'string') {
                if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
                    return 'DATE';
                }
                return 'STRING';
            } else if (typeof input === 'boolean') {
                return 'BOOLEAN';
            } else if (typeof input === 'number') {
                return Number.isInteger(input) ? 'INT' : 'STRING';
            } else if (Array.isArray(input)) {
                return 'ARRAY';
            } else if (typeof input === 'object' && input !== null) {
                return 'OBJECT';
            } else {
                return 'STRING';
            }
        };

        const sanitizeInput = (input, type) => {
            if (input === undefined || input === null) {
                Utils.sendGMMessage(`Error 01-05-01: Input is undefined or null.`);
                return null;
            }
            switch (type) {
                case 'STRING':
                    if (typeof input !== 'string') {
                        Utils.sendGMMessage(`Error 01-05-02: Expected a string, but received "${typeof input}".`);
                        return null;
                    }
                    return input.replace(/<[^>]*>/g, '').replace(/["<>]/g, '').replace(/(\r\n|\n|\r)/g, '%NEWLINE%');
                case 'ARRAY':
                    if (!Array.isArray(input)) {
                        Utils.sendGMMessage(`Error 01-05-03: Expected an array, but received "${typeof input}".`);
                        return [sanitizeInput(input, 'STRING')];
                    }
                    return input.map(item => sanitizeInput(item, checkType(item))).filter(item => item !== null);
                case 'DATE':
                    return /^\d{4}-\d{2}-\d{2}$/.test(input) ? input : null;
                case 'BOOLEAN':
                    return typeof input === 'boolean' ? input : input === 'true' || input === 'false' ? input === 'true' : null;
                case 'INT':
                    return Number.isInteger(Number(input)) ? Number(input) : null;
                case 'OBJECT':
                    if (typeof input !== 'object' || Array.isArray(input)) {
                        Utils.sendGMMessage(`Error 01-05-05: Expected an object, but received "${typeof input}".`);
                        return null;
                    }
                    const sanitizedObject = {};
                    for (const key in input) {
                        if (input.hasOwnProperty(key)) {
                            const sanitizedKey = sanitizeInput(key, 'STRING');
                            const fieldType = checkType(input[key]);
                            const sanitizedValue = sanitizeInput(input[key], fieldType);
                            if (sanitizedKey !== null && sanitizedValue !== null) {
                                sanitizedObject[sanitizedKey] = sanitizedValue;
                            }
                        }
                    }
                    return sanitizedObject;
                default:
                    Utils.sendGMMessage(`Error 01-05-04: Unsupported type "${type}".`);
                    return null;
            }
        };

        const extractFieldFromCommand = (command) => {
            if (command.includes('-') && command.split('-').length >= 3) {
                return command.split('-')[2].toLowerCase();
            }
            return null;
        };

        const handleFieldAction = (action, command, questId, item, newItem = null, dataType = 'quest', forceDataType = null, keyValue = 'value') => {
            const data = dataType === 'rumour' ? QUEST_TRACKER_globalRumours : QUEST_TRACKER_globalQuestData;
            let questData = data[questId];
            if (!questData && action !== 'add') {
                Utils.sendGMMessage(`Error 01-07-01: ${capitalize(dataType)} "${questId}" not found.`);
                return;
            }
            const field = extractFieldFromCommand(command);
            if (!field) {
                Utils.sendGMMessage(`Error 01-07-02: Invalid command format "${command}". Expected format: "qt-action-field".`);
                return;
            }
            if (action === 'add') {
                questData = questData || {};
                data[questId] = questData;
            } else {
                questData = normalizeKeys(questData);
            }
            if (!field.toLowerCase().startsWith('rootobject')) {
                initializeNestedPath(questData, field);
            }
            const fieldType = keyValue === 'key' ? 'STRING' : (forceDataType || checkType(questData[field] || newItem));
            let sanitizedValue;
            switch (fieldType) {
                case 'BOOLEAN':
                    if (typeof newItem === 'string') {
                        const lowercasedItem = newItem.toLowerCase();
                        sanitizedValue = (lowercasedItem === 'true' || lowercasedItem === '1' || lowercasedItem === 'on') ? true :
                                         (lowercasedItem === 'false' || lowercasedItem === '0' || lowercasedItem === 'off') ? false : null;
                    } else if (typeof newItem === 'number') {
                        sanitizedValue = newItem === 1 ? true : newItem === 0 ? false : null;
                    } else {
                        sanitizedValue = null;
                    }
                    break;
                case 'INT':
                    sanitizedValue = Number.isInteger(Number(newItem)) ? parseInt(newItem, 10) : null;
                    break;
                case 'STRING':
                    sanitizedValue = typeof newItem === 'string' ? sanitizeInput(newItem, 'STRING') : null;
                    break;
                case 'DATE':
                    sanitizedValue = sanitizeInput(newItem, 'DATE');
                    break;
                case 'OBJECT':
                    log("is it finding an object?")
                    sanitizedValue = Array.isArray(newItem) ? null : newItem;
                    break;
                case 'ARRAY':
                    sanitizedValue = Array.isArray(newItem) ? newItem : [newItem];
                    break;
                default:
                    sanitizedValue = sanitizeInput(newItem, fieldType);
                    break;
            }
            if (sanitizedValue === null && action !== 'remove') {
                Utils.sendGMMessage(`Error 01-07-03: Invalid value for "${field}".`);
                return;
            }
            if (sanitizedValue === null && action === 'remove' && newItem === 'force') {
                sanitizedValue = 'force';
            }
            genericFieldHandler(data, questData, questId, field, item, sanitizedValue, action, dataType, fieldType, keyValue);
            updateHandoutField(dataType);
        };

        const genericFieldHandler = (data, questData, questId, field, item, newValue, action, dataType, fieldType, keyValue) => {
            const fieldParts = field.split('|');
            let target = questData;
            if (fieldParts[0].toLowerCase() === 'rootobject') {
                if (fieldParts.length === 2 && fieldParts[1] === questId) {
                    if (action === 'add') {
                        data[questId] = newValue;
                        Utils.sendGMMessage(`Success: Initialized root object "${questId}" for quest "${questId}".`);
                        return;
                    } else if (action === 'remove') {
                        delete data[questId];
                        Utils.sendGMMessage(`Success: Removed root object "${questId}" from quest data.`);
                        return;
                    }
                }
            }
           for (let i = 0; i < fieldParts.length - 1; i++) {
                const part = fieldParts[i];
                if (typeof target[part] !== 'object' || target[part] === null) {
                    target[part] = {};
                }
                target = target[part];
            }
            const finalField = fieldParts[fieldParts.length - 1];
            switch (action) {
                 case 'add':
                    if (fieldType === 'ARRAY') {
                        if (!Array.isArray(target[finalField])) {
                            target[finalField] = [];
                        }
                        const newItems = Array.isArray(newValue) ? newValue : [newValue];
                        newItems.forEach((value) => {
                            if (!target[finalField].includes(value)) {
                                target[finalField].push(value);
                            } else {
                                Utils.sendGMMessage(`Error 01-08-02: "${value}" is already in the ${field} list of ${dataType} "${questData.name}".`);
                            }
                        });
                    } else if (fieldType === 'OBJECT') {
                        if (typeof target[finalField] !== 'object' || target[finalField] === null) {
                            target[finalField] = {};
                        }
                        if (!target[finalField].hasOwnProperty(item)) {
                            target[finalField][item] = newValue;
                        } else {
                            Utils.sendGMMessage(`Error 01-08-03: Key "${item}" already exists in ${field} of ${dataType} "${questData.name}".`);
                        }
                    } else if (fieldType === 'STRING') {
                        if (typeof newValue !== 'string') {
                            Utils.sendGMMessage(`Error 01-08-04: Expected a string, but received "${typeof newValue}".`);
                            return;
                        }
                        target[finalField] = newValue;
                    } else if (fieldType === 'DATE') {
                        const datePattern = /^\d{4}-\d{2}-\d{2}$/;
                        if (!datePattern.test(newValue)) {
                            Utils.sendGMMessage(`Error 01-08-05: Invalid date format for field "${field}". Expected format: YYYY-MM-DD.`);
                            return;
                        }
                        target[finalField] = newValue;
                    } else if (fieldType === 'BOOLEAN') {
                        target[finalField] = newValue === 'true';
                    } else {
                        if (typeof target[finalField] !== 'object' || target[finalField] === null) {
                            target[finalField] = {};
                        }
                        target[finalField][item] = newValue;
                    }
                    break;
                case 'remove':
                    if (fieldType === 'ARRAY') {
                        const itemsToRemove = Array.isArray(newValue) ? newValue : [newValue];
                        itemsToRemove.forEach((value) => {
                            if (target[finalField].includes(value)) {
                                target[finalField] = target[finalField].filter(i => i !== value);
                            } else {
                                Utils.sendGMMessage(`Error : "${value}" is not in the ${field} list of ${dataType} "${questData.name}".`);
                            }
                        });
                    } else if (fieldType === 'OBJECT') {
                        if (typeof target[finalField] === 'object' && target[finalField] !== null) {
                            if (Object.keys(target[finalField]).length === 0 || newValue === 'force') {
                                delete target[finalField];
                            } else {
                                Utils.sendGMMessage(`Error: Cannot remove non-empty object "${finalField}" from ${field} of ${dataType} "${questData.name}". Use force option to override.`);
                            }
                        } else {
                            Utils.sendGMMessage(`Error 01-08-13: Field "${finalField}" is not an object in ${dataType} "${questData.name}".`);
                        }
                    } else if (fieldType === 'STRING') {
                        if (target[finalField] === newValue) {
                            delete target[finalField];
                        } else {
                            Utils.sendGMMessage(`Error 01-08-10: The string "${newValue}" does not match the current value in ${field} of ${dataType} "${questData.name}".`);
                        }
                    } else if (fieldType === 'DATE') {
                        const datePattern = /^\d{4}-\d{2}-\d{2}$/;
                        if (!datePattern.test(newValue)) {
                            Utils.sendGMMessage(`Error 01-08-11: Invalid date format for field "${field}". Expected format: YYYY-MM-DD.`);
                            return;
                        }
                        delete target[finalField];
                    } else if (fieldType === 'BOOLEAN') {
                        if (typeof target[finalField] === 'boolean') {
                            delete target[finalField];
                        } else {
                            Utils.sendGMMessage(`Error 01-08-19: Field "${finalField}" is not a BOOLEAN in ${dataType} "${questData.name}".`);
                        }
                    } else {
                        Utils.sendGMMessage(`Error 01-08-13: Unsupported field type "${fieldType}" for action "remove".`);
                    }
                    break;
                case 'update':
                    if (keyValue === 'key') {
                        target[newValue] = target[finalField];
                        delete target[finalField];
                    } else {
                        if (fieldType === 'ARRAY') {
                            const itemsToUpdate = Array.isArray(newValue) ? newValue : [newValue];
                            itemsToUpdate.forEach((value, index) => {
                                if (target[finalField].includes(item)) {
                                    const itemIndex = target[finalField].indexOf(item);
                                    target[finalField][itemIndex] = value;
                                } else {
                                    Utils.sendGMMessage(`Error 01-08-14: "${item}" is not in the ${finalField} list of ${dataType} "${questData.name}".`);
                                }
                            });
                        } else if (fieldType === 'OBJECT') {
                            if (typeof target[finalField] === 'object' && target[finalField] !== null) {
                                target[finalField][item] = newValue;
                            } else {
                                target[finalField] = { [item]: newValue };
                            }
                        } else if (fieldType === 'STRING') {
                            if (typeof newValue === 'string') {
                                target[finalField] = newValue;
                            } else {
                                Utils.sendGMMessage(`Error 01-08-15: Expected a string for field "${finalField}", but received "${typeof newValue}".`);
                            }
                        } else if (fieldType === 'DATE') {
                            const datePattern = /^\d{4}-\d{2}-\d{2}$/;
                            if (datePattern.test(newValue)) {
                                target[finalField] = newValue;
                            } else {
                                Utils.sendGMMessage(`Error 01-08-16: Invalid date format for field "${finalField}". Expected format: YYYY-MM-DD.`);
                            }
                        } else if (fieldType === 'BOOLEAN') {
                            target[finalField] = newValue;
                        } else if (fieldType === 'INT') {
                            target[finalField] = parseInt(newValue, 10);
                        } else {
                            Utils.sendGMMessage(`Error 01-08-17: Unsupported field type "${fieldType}" for action "update".`);
                        }
                    }
                    break;
            }
            if (dataType.toLowerCase() === 'rumour') {
                QUEST_TRACKER_globalRumours[questId] = questData;
            } else {
                QUEST_TRACKER_globalQuestData[questId] = questData;
            }
            Rumours.calculateRumoursByLocation();
            saveQuestTrackerData();
        };

        const updateHandoutField = (dataType = 'quest') => {
            const handoutName = dataType.toLowerCase() === 'rumour' ? QUEST_TRACKER_RumourHandoutName : QUEST_TRACKER_QuestHandoutName;
            const handout = findObjs({ type: 'handout', name: handoutName })[0];
            if (!handout) {
                log(`Error 01-09-01: Handout "${handoutName}" not found.`);
                return;
            }
            handout.get('gmnotes', (notes) => {
                const cleanedContent = Utils.stripJSONContent(notes);
                let data;
                try {
                    data = JSON.parse(cleanedContent);
                    data = normalizeKeys(data);
                } catch (error) {
                    log(`Error 01-09-02: Failed to parse JSON data from GM notes: ${error.message}`);
                    return;
                }
                const updatedData = dataType.toLowerCase() === 'rumour' ? QUEST_TRACKER_globalRumours : QUEST_TRACKER_globalQuestData;
                const updatedContent = QUEST_TRACKER_readableJSON 
                    ? JSON.stringify(updatedData, null, 2)
                        .replace(/\n/g, '<br>')
                        .replace(/ {2}/g, '&nbsp;&nbsp;')
                    : JSON.stringify(updatedData);
                handout.set('gmnotes', updatedContent, (err) => {
                    if (err) {
                        log(`Error 01-09-03: Failed to update GM notes for "${handoutName}": ${err.message}`);
                        if (dataType.toLowerCase() === 'rumour') {
                            QUEST_TRACKER_globalRumours = JSON.parse(cleanedContent);
                        } else {
                            QUEST_TRACKER_globalQuestData = JSON.parse(cleanedContent);
                        }
                    } else {
                        Utils.sendGMMessage(`Success: Updated data for ${dataType}.`);
                    }
                });
            });
        };

        const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);
        
        const convertToArray = (input) => {
            if (Array.isArray(input)) {
                return input;
            } else if (typeof input === 'object') {
                return Object.values(input);
            } else if (!input) {
                return [];
            } else {
                return [input];
            }
        };

        const getStatusByName = (statusName) => {
            const statusKey = Object.keys(statusMapping).find(key => statusMapping[key].toLowerCase() === statusName.toLowerCase());
            return statusKey ? parseInt(statusKey, 10) : 1; 
        };

        const togglereadableJSON = (value) => {
            QUEST_TRACKER_readableJSON = (value === 'true');
            saveQuestTrackerData();
            updateHandoutField('quest');
            updateHandoutField('rumour');

            Utils.sendGMMessage(`Readable JSON has been set to ${QUEST_TRACKER_readableJSON ? 'on' : 'off'}. %NEWLINE% JSON files have been ${QUEST_TRACKER_readableJSON ? 'Prettifed' : 'compressed'}.`);
        };

        const sanitizeString = (input) => {
            if (typeof input !== 'string') {
                Utils.sendGMMessage('Error 01-14-01: Expected a string input.');
                return null;
            }
            const sanitizedString = input.replace(/[^a-zA-Z0-9_ ]/g, '_');
            return sanitizedString;
        };

        const initializeNestedPath = (obj, path) => {
            const parts = path.split('|');
            let current = obj;
            for (const part of parts) {
                if (typeof current[part] !== 'object' || current[part] === null) {
                    current[part] = {};
                }
                current = current[part];
            }
        };

        const runInBatches = (tasks, batchSize = 20, delay = 100, totalTasks = null, callback = () => {}) => {
            totalTasks = totalTasks || tasks.length;
            const taskBatch = tasks.splice(0, batchSize);
            taskBatch.forEach(task => task());
            const completedTasks = totalTasks - tasks.length;
            const progressPercent = Math.floor((completedTasks / totalTasks) * 100);
            log(`Batch Processing: ${completedTasks}/${totalTasks} (${progressPercent}%)`);
            if (tasks.length > 0) {
                setTimeout(() => Utils.runInBatches(tasks, batchSize, delay, totalTasks, callback), delay);
            } else {
                callback();
            }
        };

        return {
            sendGMMessage,
            normalizeKeys,
            stripJSONContent,
            sanitizeInput,
            checkType,
            updateHandoutField,
            handleFieldAction,
            convertToArray,
            getStatusByName,
            togglereadableJSON,
            sanitizeString,
            runInBatches
        };
    })();

    const Import = (() => {
        
        const fullImportProcess = () => {
            Utils.sendGMMessage("Starting full import process. This may take some time...");
            importData(QUEST_TRACKER_QuestHandoutName, 'QUEST_TRACKER_globalQuestData', 'Quest');
            importData(QUEST_TRACKER_RumourHandoutName, 'QUEST_TRACKER_globalRumours', 'Rumour');
            syncQuestRollableTable();
            Quest.buildQuestGenerations();
            cleanUpLooseEnds();
            cleanUpDataFields();
            Quest.populateQuestsToAutoAdvance();
            Utils.sendGMMessage("Import completed and cleanup executed.");
        };


        const importData = (handoutName, globalVarName, dataType) => {
            Utils.sendGMMessage(`Importing ${dataType} data. This might take some time. Please be patient...`);
            let handout = findObjs({ type: 'handout', name: handoutName })[0];
            if (!handout) {
                log(`Error 01-01: ${dataType} handout "${handoutName}" not found.`);
                return;
            }
            handout.get('gmnotes', (notes) => {
                const cleanedContent = Utils.stripJSONContent(notes);
                try {
                    let parsedData = JSON.parse(cleanedContent);
                    const convertKeysToLowerCase = (obj) => {
                        if (typeof obj !== 'object' || obj === null) {
                            return obj;
                        }
                        if (Array.isArray(obj)) {
                            return obj.map(item => convertKeysToLowerCase(item));
                        }
                        return Object.keys(obj).reduce((acc, key) => {
                            const lowercaseKey = key.toLowerCase();
                            acc[lowercaseKey] = convertKeysToLowerCase(obj[key]);
                            return acc;
                        }, {});
                    };
                    parsedData = convertKeysToLowerCase(parsedData);
                    const convertArrayToLowerCase = (arr) => {
                        return arr.map(item => typeof item === 'string' ? item.toLowerCase() : item);
                    };
                    if (globalVarName === 'QUEST_TRACKER_globalQuestData') {
                        parsedData = Utils.normalizeKeys(parsedData);
                        QUEST_TRACKER_globalQuestArray = [];
                        const tasks = Object.keys(parsedData).map((questId) => {
                            return () => {
                                const quest = parsedData[questId];
                                quest.prerequisites = convertArrayToLowerCase(Utils.convertToArray(quest.prerequisites));
                                quest.mutuallyexclusive = convertArrayToLowerCase(Utils.convertToArray(quest.mutuallyexclusive));
                                quest.children = convertArrayToLowerCase(Utils.convertToArray(quest.children));
                                QUEST_TRACKER_globalQuestArray.push({ id: questId, weight: quest.weight || 1 });
                            };
                        });
                        Utils.runInBatches(tasks, 20, 100, tasks.length);
                        QUEST_TRACKER_globalQuestData = parsedData;
                    } else if (globalVarName === 'QUEST_TRACKER_globalRumours') {
                        parsedData = Utils.normalizeKeys(parsedData);
                        const tasks = Object.keys(parsedData).flatMap((questId) => {
                            return Object.keys(parsedData[questId]).flatMap((status) => {
                                return Object.keys(parsedData[questId][status]).map((location) => {
                                    return () => {
                                        let rumours = parsedData[questId][status][location];
                                        if (typeof rumours === 'object' && !Array.isArray(rumours)) {
                                            parsedData[questId][status][location] = rumours;
                                        } else {
                                            log(`Error 01-02: Rumours for location "${location}" under status "${status}" for quest "${questId}" is not in the correct key/value format.`);
                                            parsedData[questId][status][location] = {};
                                        }
                                    };
                                });
                            });
                        });
                        Utils.runInBatches(tasks, 20, 100, tasks.length);
                        QUEST_TRACKER_globalRumours = parsedData;
                        Rumours.calculateRumoursByLocation();
                        Rumours.cleanupRumoursJSON();
                    }
                    saveQuestTrackerData();
                    Utils.sendGMMessage(`${dataType} data imported successfully.`);
                } catch (error) {
                    log(`Error 01-03: Error parsing ${dataType} data: ${error.message}`);
                }
            });
        };

        const cleanUpLooseEnds = () => {
            const tasks = [];
            Object.keys(QUEST_TRACKER_globalQuestData).forEach(questId => {
                const quest = QUEST_TRACKER_globalQuestData[questId];
                const fixRelationship = (relatedList, relationField, oppositeField) => {
                    if (!relatedList || !Array.isArray(relatedList)) return;
                    const validRelatedIds = relatedList.filter(relatedId => {
                        if (!relatedId || typeof relatedId !== 'string') {
                            return false;
                        }
                        return true;
                    });
                    validRelatedIds.forEach(relatedId => {
                        tasks.push(() => {
                            const relatedQuest = QUEST_TRACKER_globalQuestData[relatedId.toLowerCase()];
                            if (relatedQuest) {
                                if (!relatedQuest[oppositeField].includes(questId)) {
                                    relatedQuest[oppositeField].push(questId);
                                    Utils.handleFieldAction('add', `qt-add-${oppositeField}`, relatedId, questId, null, 'quest');
                                }
                            }
                        });
                    });
                    tasks.push(() => {
                        quest[relationField] = validRelatedIds;
                    });
                };
                fixRelationship(quest.children, 'children', 'prerequisites');
                fixRelationship(quest.prerequisites, 'prerequisites', 'children');
                fixRelationship(quest.mutuallyexclusive, 'mutuallyexclusive', 'mutuallyexclusive');
            });
            Utils.runInBatches(tasks, 20, 100, tasks.length, () => {
                Utils.sendGMMessage("Clean-up of loose ends completed.");
                saveQuestTrackerData();
            });
        };

        const syncQuestRollableTable = () => {
            let questTable = findObjs({ type: 'rollabletable', name: 'quests' })[0];
            const questTableItems = findObjs({ type: 'tableitem', rollabletableid: questTable.id });
            const tableItemMap = {};
            questTableItems.forEach(item => {
                tableItemMap[item.get('name')] = item;
            });
            const questIdsInGlobalData = Object.keys(QUEST_TRACKER_globalQuestData);
            questIdsInGlobalData.forEach(questId => {
                if (!tableItemMap[questId]) {
                    createObj('tableitem', {
                        rollabletableid: questTable.id,
                        name: questId,
                        weight: 1
                    });
                }
            });
            questTableItems.forEach(item => {
                const questId = item.get('name');
                if (!QUEST_TRACKER_globalQuestData[questId]) {
                    item.remove();
                }
            });
        };

        const cleanUpDataFields = () => {
            const tasks = [];
            Object.keys(QUEST_TRACKER_globalQuestData).forEach(questId => {
                const quest = QUEST_TRACKER_globalQuestData[questId];
                const cleanField = (field) => {
                    if (!quest[field] || !Array.isArray(quest[field])) {
                        tasks.push(() => {
                            Utils.handleFieldAction('update', `qt-update-${field}`, questId, null, [], 'quest');
                        });
                    } else {
                        quest[field].forEach(item => {
                            if (item === null || typeof item !== 'string') {
                                tasks.push(() => {
                                    Utils.handleFieldAction('remove', `qt-remove-${field}`, questId, item, null, 'quest');
                                });
                            }
                        });
                    }
                };
                
                cleanField('children');
                cleanField('prerequisites');
                cleanField('mutuallyexclusive');
            });
            Utils.runInBatches(tasks, 20, 100, tasks.length, () => {
                saveQuestTrackerData();
                Utils.sendGMMessage("Data fields cleaned up successfully, with all null entries removed and empty arrays standardized.");
                Utils.updateHandoutField('quest');
            });
        };

        return {
            fullImportProcess,
            cleanUpLooseEnds
        };
    })();

    const Quest = (() => {
        const buildQuestGenerations = () => {
            QUEST_TRACKER_generations = {};
            const visited = new Set();
            const roots = Object.keys(QUEST_TRACKER_globalQuestData).filter(questId => {
                const quest = QUEST_TRACKER_globalQuestData[questId];
                return Array.isArray(quest.prerequisites) && quest.prerequisites.length === 0;
            });
            if (roots.length === 0) {
                Utils.sendGMMessage("Error: No root quests found. Check if quest data is correctly formatted.");
                return;
            }
            QUEST_TRACKER_generations[1] = roots;
            roots.forEach(root => visited.add(root));
            let currentGeneration = roots;
            let generationLevel = 2;
            while (currentGeneration.length > 0) {
                const nextGeneration = [];
                currentGeneration.forEach(questId => {
                    const quest = QUEST_TRACKER_globalQuestData[questId];
                    if (Array.isArray(quest.children)) {
                        quest.children.forEach(childId => {
                            if (!visited.has(childId) && QUEST_TRACKER_globalQuestData[childId]) {
                                visited.add(childId);
                                nextGeneration.push(childId);
                            } else if (!QUEST_TRACKER_globalQuestData[childId]) {
                                Utils.sendGMMessage(`Warning: Child quest ID ${childId} is missing in global quest data.`);
                            }
                        });
                    }
                });
                if (nextGeneration.length > 0) {
                    QUEST_TRACKER_generations[generationLevel] = nextGeneration;
                    generationLevel++;
                }
                currentGeneration = nextGeneration;
            }
            saveQuestTrackerData();
        };


        const isGenerationallyRelated = (questId, targetId) => {
            const questGenerationLevel = Object.keys(QUEST_TRACKER_generations).find(level =>
                QUEST_TRACKER_generations[level].includes(questId)
            );
            const targetGenerationLevel = Object.keys(QUEST_TRACKER_generations).find(level =>
                QUEST_TRACKER_generations[level].includes(targetId)
            );
            if (!questGenerationLevel || !targetGenerationLevel) {
                return false;
            }
            if (questGenerationLevel === targetGenerationLevel) {
                return false;
            }
            const isDescendant = (ancestorId, descendantId) => {
                const visited = new Set();
                const stack = [ancestorId];
                while (stack.length > 0) {
                    const current = stack.pop();
                    if (current === descendantId) {
                        return true;
                    }
                    const currentQuest = QUEST_TRACKER_globalQuestData[current];
                    if (currentQuest) {
                        currentQuest.children.forEach(childId => {
                            if (!visited.has(childId)) {
                                stack.push(childId);
                                visited.add(childId);
                            }
                        });
                    }
                }
                return false;
            };
            return isDescendant(questId, targetId) || isDescendant(targetId, questId);
        };

        const updateQuestStatus = (questId, status) => {
            let table = findObjs({ type: 'rollabletable', name: 'quests' })[0];
            if (!table) {
                log(`Error 02-03-01: Rollable table "quests" not found.`);
                return;
            }
            let items = findObjs({ type: 'tableitem', rollabletableid: table.id });
            let item = items.find(i => i.get('name') === questId);
            if (item) {
                item.set('weight', status);
                QUEST_TRACKER_globalQuestArray = QUEST_TRACKER_globalQuestArray.map(q => {
                    if (q.id === questId) {
                        q.weight = status;
                    }
                    return q;
                });
                saveQuestTrackerData();
            }
        };

        const getStatusNameByQuestId = (questId, questArray) => {
            let quest = questArray.find(q => q.id === questId);
            if (quest) {
                return statusMapping[quest.weight] || 'Unknown';
            }
            return 'Unknown';
        };

        const populateQuestsToAutoAdvance = () => {
            QUEST_TRACKER_questsToAutoAdvance = Object.keys(QUEST_TRACKER_globalQuestData).filter(questId => {
                const quest = QUEST_TRACKER_globalQuestData[questId];
                const currentStatus = getStatusNameByQuestId(questId, QUEST_TRACKER_globalQuestArray);
                return (
                    quest.autoadvance &&
                    Object.keys(quest.autoadvance).length > 0 &&
                    currentStatus !== 'Completed' &&
                    currentStatus !== 'Completed By Someone Else' &&
                    currentStatus !== 'Failed'
                );
            });
            saveQuestTrackerData();
        };

        const hasRelationship = (questId, targetId, relationshipType) => {
            const quest = QUEST_TRACKER_globalQuestData[questId];
            if (!quest || !quest[relationshipType]) return false;
            return quest[relationshipType].includes(targetId);
        };

        const getExcludedQuests = (questId, relatedFields, currentSelection) => {
            const excludedQuests = new Set([questId]);
            const questData = QUEST_TRACKER_globalQuestData[questId];
            relatedFields.forEach(field => {
                if (questData && questData[field]) {
                    questData[field].forEach(relatedId => excludedQuests.add(relatedId));
                }
            });
            currentSelection.forEach(selectedQuest => excludedQuests.add(selectedQuest));
            return excludedQuests;
        };

        const checkCircularDependency = (questId, targetId, relationshipType) => {
            const visited = new Set();
            const stack = [targetId];
            while (stack.length > 0) {
                const current = stack.pop();
                if (current === questId) {
                    return true;
                }
                const currentQuest = QUEST_TRACKER_globalQuestData[current];
                if (currentQuest) {
                    currentQuest[relationshipType].forEach(relatedId => {
                        if (!visited.has(relatedId)) {
                            stack.push(relatedId);
                            visited.add(relatedId);
                        }
                    });
                }
            }
            return false;
        };

        const checkValidity = (questId, targetId, relationshipType, action) => {
            if (!QUEST_TRACKER_globalQuestData[questId] || !QUEST_TRACKER_globalQuestData[targetId]) {
                Utils.sendGMMessage(`Error 02-06-01: Quest "${questId}" or "${targetId}" not found.`);
                return false;
            }
            if (relationshipType === 'mutuallyexclusive' && isGenerationallyRelated(questId, targetId)) {
                Utils.sendGMMessage(`Error 02-06-02: Quests "${questId}" and "${targetId}" are generationally related and cannot be mutually exclusive.`);
                return false;
            }
            if (['child', 'prerequisite'].includes(relationshipType) && isGenerationallyRelated(questId, targetId)) {
                Utils.sendGMMessage(`Error 02-06-03: Quests "${questId}" and "${targetId}" are generationally related and cannot be linked as ${relationshipType}.`);
                return false;
            }
            if (action === 'add' && checkCircularDependency(questId, targetId, relationshipType === 'child' ? 'children' : 'prerequisites')) {
                Utils.sendGMMessage(`Error 02-06-05: Adding quest "${targetId}" as a ${relationshipType} would create a circular dependency.`);
                return false;
            }
            return true;
        };

        const getValidQuestsForDropdown = (questId, relatedFields = [], currentSelection = []) => {
            const excludedQuests = getExcludedQuests(questId, relatedFields, currentSelection);
            if (!QUEST_TRACKER_generations || Object.keys(QUEST_TRACKER_generations).length === 0) {
                Utils.sendGMMessage(`Error 02-09-01: Quest generations have not been initialized.`);
                return [];
            }
            const generationLevel = Object.keys(QUEST_TRACKER_generations).find(level =>
                QUEST_TRACKER_generations[level].includes(questId)
            );
            if (!generationLevel) {
                Utils.sendGMMessage(`Error 02-09-02: Quest "${questId}" is not assigned to any generation.`);
                return [];
            }
            return QUEST_TRACKER_generations[generationLevel].filter(qId =>
                !excludedQuests.has(qId) && !hasRelationship(questId, qId, 'mutuallyexclusive')
            );
        };

        const manageRelationship = (action, field, questId, targetId, newTargetId = null) => {
            const fieldToRelationshipType = {
                children: 'child',
                prerequisites: 'prerequisite',
                mutuallyexclusive: 'mutuallyexclusive'
            };
            const relationshipType = fieldToRelationshipType[field];
            if (!relationshipType) {
                Utils.sendGMMessage(`Error 02-10-01: Invalid field "${field}" specified. Use 'children', 'prerequisites', or 'mutuallyexclusive'.`);
                return;
            }
            if (!checkValidity(questId, targetId, relationshipType, action)) {
                return;
            }
            const quest = QUEST_TRACKER_globalQuestData[questId];
            const targetQuest = QUEST_TRACKER_globalQuestData[targetId];
            const newTargetQuest = newTargetId ? QUEST_TRACKER_globalQuestData[newTargetId] : null;
            if (!quest) {
                Utils.sendGMMessage(`Error 02-10-02: Quest "${questId}" not found.`);
                return;
            }
            if (!targetQuest) {
                Utils.sendGMMessage(`Error 02-10-03: Quest "${targetId}" not found.`);
                return;
            }
            quest.children = quest.children || [];
            quest.prerequisites = quest.prerequisites || [];
            quest.mutuallyexclusive = quest.mutuallyexclusive || [];
            targetQuest.children = targetQuest.children || [];
            targetQuest.prerequisites = targetQuest.prerequisites || [];
            targetQuest.mutuallyexclusive = targetQuest.mutuallyexclusive || [];
            const relationshipField = {
                child: 'children',
                prerequisite: 'prerequisites',
                mutuallyexclusive: 'mutuallyexclusive'
            }[relationshipType];
            const oppositeField = {
                child: 'prerequisites',
                prerequisite: 'children',
                mutuallyexclusive: 'mutuallyexclusive'
            }[relationshipType];
            switch (action) { 
                case 'add':
                    if (!quest[relationshipField].includes(targetId)) {
                        Utils.handleFieldAction('add', `qt-add-${relationshipField}`, questId, '', targetId, 'quest');
                    }
                    if (!targetQuest[oppositeField].includes(questId)) {
                        Utils.handleFieldAction('add', `qt-add-${oppositeField}`, targetId, '', questId, 'quest');
                    }
                    break;
                case 'remove':
                    if (quest[relationshipField].includes(targetId)) {
                        Utils.handleFieldAction('remove', `qt-remove-${relationshipField}`, questId, '', targetId, 'quest');
                    }
                    if (targetQuest[oppositeField].includes(questId)) {
                        Utils.handleFieldAction('remove', `qt-remove-${oppositeField}`, targetId, '', questId, 'quest');
                    }
                    break;
                case 'update':
                    if (newTargetId && newTargetQuest) {
                        if (quest[relationshipField].includes(targetId)) {
                            Utils.handleFieldAction('remove', `qt-remove-${relationshipField}`, questId, '', targetId, 'quest');
                        }
                        if (targetQuest[oppositeField].includes(questId)) {
                            Utils.handleFieldAction('remove', `qt-remove-${oppositeField}`, targetId, '', questId, 'quest');
                        }
                        if (!quest[relationshipField].includes(newTargetId)) {
                            Utils.handleFieldAction('add', `qt-add-${relationshipField}`, questId, '', newTargetId, 'quest');
                        }
                        if (!newTargetQuest[oppositeField].includes(questId)) {
                            Utils.handleFieldAction('add', `qt-add-${oppositeField}`, newTargetId, '', questId, 'quest');
                        }
                    } else {
                        Utils.sendGMMessage(`Error 02-10-05: New target "${newTargetId}" not found for update.`);
                    }
                    break;
                default:
                    Utils.sendGMMessage(`Error 02-10-04: Invalid action "${action}" specified for relationship management.`);
                    return;
            }
        };

        const removeQuest = (questId) => {
            if (!QUEST_TRACKER_globalQuestData[questId]) {
                Utils.sendGMMessage(`Error 02-11-01: Quest "${questId}" not found.`);
                return;
            }
            const previousData = JSON.stringify(QUEST_TRACKER_globalQuestData);
            const previousQuestArray = JSON.stringify(QUEST_TRACKER_globalQuestArray);
            const questTable = findObjs({ type: 'rollabletable', name: 'quests' })[0];
            const previousTableItems = questTable
                ? findObjs({ type: 'tableitem', rollabletableid: questTable.id }).map(item => ({
                      id: item.id,
                      name: item.get('name'),
                      weight: item.get('weight'),
                  }))
                : [];
            try {
                Object.keys(QUEST_TRACKER_globalQuestData).forEach(otherQuestId => {
                    const otherQuest = QUEST_TRACKER_globalQuestData[otherQuestId];
                    if (otherQuestId !== questId) {
                        ['children', 'prerequisites', 'mutuallyexclusive'].forEach(rel => {
                            if (otherQuest[rel] && otherQuest[rel].includes(questId)) {
                                manageRelationship('remove', rel, otherQuestId, questId);
                            }
                        });
                    }
                });
                Utils.handleFieldAction('remove', `qt-remove-ROOTOBJECT|${questId}`, questId, questId, 'force', 'quest', 'OBJECT');
                QUEST_TRACKER_globalQuestArray = QUEST_TRACKER_globalQuestArray.filter(quest => quest.id !== questId);
                delete QUEST_TRACKER_globalQuestData[questId];
                if (questTable) {
                    const item = findObjs({ type: 'tableitem', rollabletableid: questTable.id }).find(i => i.get('name') === questId);
                    if (item) {
                        item.remove(() => {
                            Utils.sendGMMessage(`Success: Quest "${questId}" removed from the rollable table.`);
                        });
                    } else {
                        log(`Error 02-11-02: Quest "${questId}" not found in the rollable table.`);
                    }
                } else {
                    log('Error 02-11-03: Rollable table "quests" not found.');
                }
                Import.cleanUpLooseEnds();
                buildQuestGenerations();
                saveQuestTrackerData();
                Rumours.removeAllRumoursForQuest(questId);
                Utils.sendGMMessage(`Quest "${questId}" has been successfully removed, and all references to it have been cleaned.`);
            } catch (error) {
                log(`Error 02-11-03: Error detected: ${error.message}`);
                QUEST_TRACKER_globalQuestData = JSON.parse(previousData);
                QUEST_TRACKER_globalQuestArray = JSON.parse(previousQuestArray);
                if (questTable) {
                    findObjs({ type: 'tableitem', rollabletableid: questTable.id }).forEach(item => item.remove());
                    previousTableItems.forEach(itemData => {
                        createObj('tableitem', {
                            rollabletableid: questTable.id,
                            name: itemData.name,
                            weight: itemData.weight,
                        });
                    });
                    log('Reverted rollable table to the previous state.');
                }
                Utils.sendGMMessage(`Error during quest removal: ${error.message}. Reverted to previous state.`);
            }
        };

        const addQuest = () => {
            const existingQuestIds = Object.keys(QUEST_TRACKER_globalQuestData);
            const highestQuestNumber = existingQuestIds.reduce((max, id) => {
                const match = id.match(/^quest_(\d+)$/);
                if (match) {
                    const number = parseInt(match[1], 10);
                    return number > max ? number : max;
                }
                return max;
            }, 0);
            const newQuestNumber = highestQuestNumber + 1;
            const newQuestId = `quest_${newQuestNumber}`;
            const defaultQuestData = {
                name: 'New Quest',
                description: 'Description',
                prerequisites: [],
                mutuallyexclusive: [],
                children: [],
                hidden: true,
                autoadvance: {}
            };
            const previousData = JSON.stringify(QUEST_TRACKER_globalQuestData);
            const previousQuestArray = JSON.stringify(QUEST_TRACKER_globalQuestArray);
            const questTable = findObjs({ type: 'rollabletable', name: 'quests' })[0];
            const previousTableItems = questTable
                ? findObjs({ type: 'tableitem', rollabletableid: questTable.id }).map(item => ({
                      id: item.id,
                      name: item.get('name'),
                      weight: item.get('weight'),
                  }))
                : [];
            try {
                QUEST_TRACKER_globalQuestData[newQuestId] = defaultQuestData;
                Utils.handleFieldAction('add', `qt-add-ROOTOBJECT|${newQuestId}`, newQuestId, null, defaultQuestData, 'quest', 'OBJECT');
                QUEST_TRACKER_globalQuestArray.push({ id: newQuestId, weight: 1 });
                if (questTable) {
                    createObj('tableitem', {
                        rollabletableid: questTable.id,
                        name: newQuestId,
                        weight: 1,
                    });
                }
                saveQuestTrackerData();
                buildQuestGenerations();
                Utils.sendGMMessage(`Quest "${newQuestId}" has been successfully added.`);
            } catch (error) {
                log(`Error detected: ${error.message}`);
                QUEST_TRACKER_globalQuestData = JSON.parse(previousData);
                QUEST_TRACKER_globalQuestArray = JSON.parse(previousQuestArray);
                if (questTable) {
                    findObjs({ type: 'tableitem', rollabletableid: questTable.id }).forEach(item => item.remove());
                    previousTableItems.forEach(itemData => {
                        createObj('tableitem', {
                            rollabletableid: questTable.id,
                            name: itemData.name,
                            weight: itemData.weight,
                        });
                    });
                    log('Error 02-12-02: Reverted rollable table to the previous state.');
                }
                Utils.sendGMMessage(`Error during quest addition: ${error.message}. Reverted to previous state.`);
            }
        };

        return {
            buildQuestGenerations,
            isGenerationallyRelated,
            updateQuestStatus,
            getStatusNameByQuestId,
            populateQuestsToAutoAdvance,
            checkValidity,
            checkCircularDependency,
            getValidQuestsForDropdown,
            manageRelationship,
            removeQuest,
            addQuest
        };
    })();

    const Calendar = (() => {
        const setCurrentDate = (newDate, isPublic = false, fromValue = 'Quest Tracker', messageValue = null) => {
            QUEST_TRACKER_currentDate = newDate;
            saveQuestTrackerData();
            Quest.populateQuestsToAutoAdvance();
            const defaultMessage = `The date has been set to ${QUEST_TRACKER_currentDate}`;
            sendDateChangeMessage(defaultMessage, isPublic, fromValue, messageValue);
        };

        const modifyDate = (days, isPublic = false, fromValue = 'Quest Tracker', messageValue = null) => {
            const oldDate = new Date(QUEST_TRACKER_currentDate);
            const newDate = new Date(oldDate);
            newDate.setDate(oldDate.getDate() + days);
            QUEST_TRACKER_currentDate = newDate.toISOString().split('T')[0];
            saveQuestTrackerData();
            Quest.populateQuestsToAutoAdvance();
            const defaultMessage = days > 0
                ? (days === 1 
                    ? `The date has been advanced to ${QUEST_TRACKER_currentDate}`
                    : `The date has been advanced by ${days} days to ${QUEST_TRACKER_currentDate}`)
                : (days === -1 
                    ? `The date has been retreated to ${QUEST_TRACKER_currentDate}`
                    : `The date has been retreated by ${Math.abs(days)} days to ${QUEST_TRACKER_currentDate}`);
            sendDateChangeMessage(defaultMessage, isPublic, fromValue, messageValue);
        };

        const sendDateChangeMessage = (defaultMessage, isPublic, fromValue, messageValue) => {
            Utils.sendGMMessage(defaultMessage);
            if (isPublic) {
                const sender = (fromValue !== undefined && fromValue !== null) ? fromValue : 'Quest Tracker';
                const publicMessage = messageValue || defaultMessage;
                sendChat(sender, publicMessage);
            }
        };

        const reviewQuestAdvancement = () => {
            QUEST_TRACKER_questsToAutoAdvance = QUEST_TRACKER_questsToAutoAdvance.filter(questId => {
                const quest = QUEST_TRACKER_globalQuestData[questId];
                const currentStatus = Quest.getStatusNameByQuestId(questId, QUEST_TRACKER_globalQuestArray);
                if (currentStatus === 'Completed' || currentStatus === 'Completed By Someone Else' || currentStatus === 'Failed') {
                    return false; // Remove from the array
                }
                Object.keys(quest.autoadvance).forEach(status => {
                    const dateToAdvance = quest.autoadvance[status];
                    if (QUEST_TRACKER_currentDate >= dateToAdvance) {
                        const statusWeight = Utils.getStatusByName(status);
                        Quest.updateQuestStatus(questId, statusWeight);
                        Utils.sendGMMessage(`Quest "${quest.name}" has been automatically advanced to status: "${status}".`);
                    }
                });
                const newStatus = Quest.getStatusNameByQuestId(questId, QUEST_TRACKER_globalQuestArray);
                if (newStatus === 'Completed' || newStatus === 'Completed By Someone Else' || newStatus === 'Failed') {
                    return false;
                }

                return true;
            });

            saveQuestTrackerData();
        };

        return {
            setCurrentDate,
            modifyDate,
            sendDateChangeMessage,
            reviewQuestAdvancement
        };
    })();

    const QuestPageBuilder = (() => {
        const DEFAULT_PAGE_UNIT = 70;
        const AVATAR_SIZE = 70;
        const TEXT_FONT_SIZE = 14;
        const PAGE_HEADER_WIDTH = 700;
        const PAGE_HEADER_HEIGHT = 150;
        const ROUNDED_RECT_WIDTH = 200;
        const ROUNDED_RECT_HEIGHT = 50;
        const VERTICAL_SPACING = 70;
        const HORIZONTAL_SPACING = 140;
        const DEFAULT_FILL_COLOR = '#CCCCCC';
        const DEFAULT_STATUS_COLOR = '#000000';
        const QUESTICON_WIDTH = 305;
        const QUESTICON_HEIGHT = 92;

        const clearPageObjects = (pageId, callback) => {
            const pageElements = [
                ...findObjs({ _type: 'graphic', _pageid: pageId }),
                ...findObjs({ _type: 'path', _pageid: pageId }),
                ...findObjs({ _type: 'text', _pageid: pageId })
            ];
            const removeTasks = pageElements.map(obj => () => obj.remove());
            Utils.runInBatches(removeTasks, 50, 100, removeTasks.length, callback);
        };

        const adjustPageSettings = (page) => {
            page.set({
                showgrid: false,
                snapping_increment: 0,
                diagonaltype: 'facing',
                scale_number: 1,
            });
        };

        const adjustPageSizeToFitGrid = (page, questGrid) => {
            const numRows = questGrid.filter(row => row !== undefined).length;
            let maxCols = 0;
            questGrid.forEach(row => {
                if (row) {
                    maxCols = Math.max(maxCols, row.length);
                }
            });
            const requiredWidthInPixels = Math.max(maxCols * (QUESTICON_WIDTH + HORIZONTAL_SPACING), PAGE_HEADER_WIDTH);
            const requiredHeightInPixels = Math.max(numRows * (QUESTICON_HEIGHT + VERTICAL_SPACING) + PAGE_HEADER_HEIGHT + VERTICAL_SPACING, PAGE_HEADER_HEIGHT);
            const requiredWidthInUnits = Math.ceil(requiredWidthInPixels / DEFAULT_PAGE_UNIT);
            const requiredHeightInUnits = Math.ceil(requiredHeightInPixels / DEFAULT_PAGE_UNIT);
            page.set({ width: requiredWidthInUnits, height: requiredHeightInUnits });
        };

        const buildPageHeader = (page) => {
            const titleText = 'Quest Tracker Quest Tree';
            const descriptionText = 'A visual representation of all quests.';
            const pageWidth = page.get('width') * DEFAULT_PAGE_UNIT;
            const titleX = (pageWidth / 2) - ( PAGE_HEADER_WIDTH / 2 );
            const titleY = 70;
            drawText(page.id, titleX, titleY, titleText, '#000000', 'map', 32, 'Contrail One');
            const descriptionY = titleY + 40;
            drawText(page.id, titleX, descriptionY, descriptionText, '#666666', 'map', 18, 'Contrail One');
        };

        const buildQuestTreeOnPage = () => {
            let questTreePage = findObjs({ _type: 'page', name: QUEST_TRACKER_pageName })[0];
            if (!questTreePage) {
                Utils.sendGMMessage(`Error: Page "${QUEST_TRACKER_pageName}" not found. Please create the page manually.`);
                return;
            }
            adjustPageSettings(questTreePage);
            clearPageObjects(questTreePage.id, () => {
                QUEST_TRACKER_questGrid = buildDAG(QUEST_TRACKER_globalQuestData);
                adjustPageSizeToFitGrid(questTreePage, QUEST_TRACKER_questGrid);
                buildPageHeader(questTreePage);
                QUEST_TRACKER_TreeObjRef = {};
                drawQuestConnections(questTreePage.id, QUEST_TRACKER_questGrid);
                setTimeout(() => {
                    drawQuestTreeFromGrid(questTreePage, QUEST_TRACKER_questGrid, () => {
                        setTimeout(() => {
                            drawQuestTextAfterGraphics(questTreePage, QUEST_TRACKER_questGrid);
                            setTimeout(() => {
                                saveQuestTrackerData();
                                Utils.sendGMMessage("Quest Tree rendering complete.");
                            }, 8000);
                        }, 1000);
                    });
                }, 1000);
            });
        };

        const buildDAG = (questData) => {
            const layers = [];
            const questLevels = {};
            const calculateLevel = (questId) => {
                if (questLevels[questId] !== undefined) return questLevels[questId];
                const prereqs = questData[questId]?.prerequisites || [];
                const level = prereqs.reduce((maxLevel, prereqId) => {
                    return Math.max(maxLevel, calculateLevel(prereqId) + 1);
                }, 0);
                questLevels[questId] = level;
                return level;
            };
            Object.keys(questData).forEach(questId => calculateLevel(questId));
            Object.entries(questLevels).forEach(([questId, level]) => {
                if (!layers[level]) layers[level] = [];
                layers[level].push(questId);
            });
            layers.forEach(row => {
                row.forEach((questId, index) => {
                    const exclusives = questData[questId]?.mutuallyexclusive || [];
                    exclusives.forEach(exclusiveId => {
                        if (!row.includes(exclusiveId)) {
                            row.splice(index + 1, 0, exclusiveId);
                        }
                    });
                });
            });
            return layers;
        };

        const drawQuestTreeFromGrid = (page, questGrid, callback) => {
            const totalWidth = page.get('width') * DEFAULT_PAGE_UNIT;
            const drawTasks = [];
            questGrid.forEach((row, rowIndex) => {
                const rowWidth = row.length * (QUESTICON_WIDTH + HORIZONTAL_SPACING);
                const offsetX = (totalWidth - rowWidth) / 2;
                row.forEach((questId, colIndex) => {
                    const questData = QUEST_TRACKER_globalQuestData[questId];
                    if (!questData) {
                        Utils.sendGMMessage(`Warning: Quest data for "${questId}" is missing.`);
                        return;
                    }
                    const x = offsetX + colIndex * (QUESTICON_WIDTH + HORIZONTAL_SPACING);
                    const y = rowIndex * (QUESTICON_HEIGHT + VERTICAL_SPACING) + PAGE_HEADER_HEIGHT + VERTICAL_SPACING;
                    const isHidden = questData.hidden || false;
                    drawTasks.push(() => drawQuestGraphics(questId, questData, page.id, x, y, isHidden));
                });
            });
            Utils.runInBatches(drawTasks, 50, 100, drawTasks.length, callback);
        };

        const drawQuestGraphics = (questId, questData, pageId, x, y, isHidden) => {
            const questTable = findObjs({ type: 'rollabletable', name: 'quests' })[0];
            if (!questTable) {
                Utils.sendGMMessage('Error: Quests rollable table not found.');
                return;
            }
            const questTableItems = findObjs({ type: 'tableitem', rollabletableid: questTable.id });
            const questTableItem = questTableItems.find(item => item.get('name').toLowerCase() === questId.toLowerCase());
            if (!questTableItem) {
                Utils.sendGMMessage(`Error: Rollable table item for quest "${questId}" not found.`);
                return;
            }
            const statusWeight = questTableItem.get('weight');
            const statusName = statusMapping[statusWeight] || 'Unknown';
            const statusColor = getStatusColor(statusName);
            let imgsrc = questTableItem.get('avatar');
            if (!imgsrc || !imgsrc.includes('https://')) {
                imgsrc = 'https://s3.amazonaws.com/files.d20.io/images/64616840/d93g5KPAtmXCQVwf58sG1Q/thumb.jpg?15392669545';
            } else {
                imgsrc = replaceImageSize(imgsrc);
            }
            drawRoundedRectangle(pageId, x, y, ROUNDED_RECT_WIDTH, ROUNDED_RECT_HEIGHT, 10, statusColor, isHidden ? 'gmlayer' : 'map', questId);
            const avatarX = x + AVATAR_SIZE + (AVATAR_SIZE / 2);
            const avatarY = y - (AVATAR_SIZE * 0.6);
            placeAvatar(pageId, avatarX, avatarY, AVATAR_SIZE, imgsrc, isHidden ? 'gmlayer' : 'objects', questId);
        };

        const drawQuestTextAfterGraphics = (page, questGrid) => {
            const totalWidth = page.get('width') * DEFAULT_PAGE_UNIT;
            const textTasks = [];
            questGrid.forEach((row, rowIndex) => {
                const rowWidth = row.length * (QUESTICON_WIDTH + HORIZONTAL_SPACING);
                const offsetX = (totalWidth - rowWidth) / 2;
                row.forEach((questId, colIndex) => {
                    const questData = QUEST_TRACKER_globalQuestData[questId];
                    const x = offsetX + colIndex * (QUESTICON_WIDTH + HORIZONTAL_SPACING);
                    const y = rowIndex * (QUESTICON_HEIGHT + VERTICAL_SPACING) + PAGE_HEADER_HEIGHT + VERTICAL_SPACING;
                    const isHidden = questData.hidden || false;
                    const textLayer = isHidden ? 'gmlayer' : 'objects';
                    textTasks.push(() => drawText(page.id, x + (ROUNDED_RECT_WIDTH / 2), y + (ROUNDED_RECT_HEIGHT / 2), questData.name, '#000000', textLayer, TEXT_FONT_SIZE, 'Contrail One', questId));
                });
            });
            Utils.runInBatches(textTasks, 50, 100, textTasks.length);
        };

        const drawQuestConnections = (pageId, questGrid) => {
            const totalWidth = findObjs({ _type: 'page', _id: pageId })[0].get('width') * DEFAULT_PAGE_UNIT;
            questGrid.forEach((row, rowIndex) => {
                const rowWidth = row.length * (QUESTICON_WIDTH + HORIZONTAL_SPACING);
                const offsetX = (totalWidth - rowWidth) / 2;
                row.forEach((questId, colIndex) => {
                    const questData = QUEST_TRACKER_globalQuestData[questId];
                    if (!questData) {
                        Utils.sendGMMessage(`Warning: Quest data for "${questId}" is missing.`);
                        return;
                    }
                    const startPos = {
                        x: offsetX + colIndex * (QUESTICON_WIDTH + HORIZONTAL_SPACING) + (ROUNDED_RECT_WIDTH / 2),
                        y: rowIndex * (QUESTICON_HEIGHT + VERTICAL_SPACING) + PAGE_HEADER_HEIGHT + (ROUNDED_RECT_HEIGHT * 0.5),
                    };
                    (questData.prerequisites || []).forEach(prereqId => {
                        const prereqData = QUEST_TRACKER_globalQuestData[prereqId];
                        if (!prereqData) {
                            Utils.sendGMMessage(`Warning: Prerequisite quest data for "${prereqId}" is missing.`);
                            return;
                        }
                        const prereqPos = findQuestInGrid(questGrid, prereqId);
                        if (prereqPos) {
                            const prereqRowWidth = questGrid[prereqPos.row].length * (QUESTICON_WIDTH + HORIZONTAL_SPACING);
                            const prereqOffsetX = (totalWidth - prereqRowWidth) / 2;
                            const endPos = {
                                x: prereqOffsetX + prereqPos.col * (QUESTICON_WIDTH + HORIZONTAL_SPACING) + (ROUNDED_RECT_WIDTH / 2),
                                y: prereqPos.row * (QUESTICON_HEIGHT + VERTICAL_SPACING) + PAGE_HEADER_HEIGHT + (ROUNDED_RECT_HEIGHT * 0.5),
                            };
                            const isHidden = questData.hidden || prereqData.hidden;
                            const connectionColor = isHidden ? '#CCCCCC' : '#000000';
                            const connectionLayer = isHidden ? 'gmlayer' : 'map';
                            const mid1 = { x: startPos.x, y: startPos.y + (endPos.y - startPos.y) / 2 };
                            const mid2 = { x: endPos.x, y: mid1.y };
                            drawPath(pageId, startPos, mid1, connectionColor, connectionLayer, questId, prereqId, "1");
                            drawPath(pageId, mid1, mid2, connectionColor, connectionLayer, questId, prereqId, "2");
                            drawPath(pageId, mid2, endPos, connectionColor, connectionLayer, questId, prereqId, "3");
                        }
                    });
                });
            });
        };


        const drawPath = (pageId, startPos, endPos, color = '#FF0000', layer = 'objects', questId, pathToQuestId, part) => {
            const pathData = JSON.stringify([
                ['M', 0, 0],
                ['L', endPos.x - startPos.x, endPos.y - startPos.y]
            ]);
            const pathObj = createObj('path', {
                _pageid: pageId,
                layer: layer,
                stroke: color,
                fill: 'transparent',
                left: startPos.x + (endPos.x - startPos.x) / 2,
                top: startPos.y + (endPos.y - startPos.y) / 2,
                width: Math.abs(endPos.x - startPos.x),
                height: Math.abs(endPos.y - startPos.y),
                path: pathData,
                stroke_width: 2,
                controlledby: ''
            });
            storeQuestRef(questId, 'paths', pathObj.id, pathToQuestId, part);
            storeQuestRef(pathToQuestId, 'paths', pathObj.id, questId, part);
        };

        const findQuestInGrid = (questGrid, questId) => {
            for (let rowIndex = 0; rowIndex < questGrid.length; rowIndex++) {
                const colIndex = questGrid[rowIndex].indexOf(questId);
                if (colIndex !== -1) {
                    return { row: rowIndex, col: colIndex };
                }
            }
            return null;
        };

        const drawRoundedRectangle = (pageId, x, y, width, height, radius, statusColor, layer = 'objects', questId) => {
            const rectObj = createObj('path', {
                _pageid: pageId,
                layer: layer,
                stroke: statusColor,
                fill: "#FAFAD2",
                left: x + width / 2,
                top: y + height / 2,
                width: width,
                height: height,
                path: JSON.stringify([
                    ['M', -width / 2 + radius, -height / 2],
                    ['L', width / 2 - radius, -height / 2],
                    ['Q', width / 2, -height / 2, width / 2, -height / 2 + radius],
                    ['L', width / 2, height / 2 - radius],
                    ['Q', width / 2, height / 2, width / 2 - radius, height / 2],
                    ['L', -width / 2 + radius, height / 2],
                    ['Q', -width / 2, height / 2, -width / 2, height / 2 - radius],
                    ['L', -width / 2, -height / 2 + radius],
                    ['Q', -width / 2, -height / 2, -width / 2 + radius, -height / 2],
                    ['Z']
                ]),
                stroke_width: 4,
                controlledby: ''
            });
            if (rectObj) {
                storeQuestRef(questId, 'rectangle', rectObj.id);
            }
        };

        const drawText = (pageId, x, y, textContent, color = '#000000', layer = 'objects', font_size = TEXT_FONT_SIZE, font_family = 'Arial', questId) => {
            const textObj = createObj('text', {
                _pageid: pageId,
                left: x,
                top: y,
                text: textContent,
                font_size: font_size,
                color: color,
                layer: layer,
                font_family: font_family
            });
            if (textObj) {
                storeQuestRef(questId, 'text', textObj.id);
            }
        };

        const placeAvatar = (pageId, x, y, avatarSize, imgsrc, layer = 'objects', questId) => {
            const questData = QUEST_TRACKER_globalQuestData[questId];
            let tooltipText = `${questData.description || 'No description available.'}`;
            let trimmedText = trimText(tooltipText, 150);
            const avatarObj = createObj('graphic', {
                _pageid: pageId,
                left: x,
                top: y,
                width: avatarSize,
                height: avatarSize,
                layer: layer,
                imgsrc: imgsrc,
                tooltip: trimmedText,
                controlledby: ''
            });
            if (avatarObj) {
               storeQuestRef(questId, 'avatar', avatarObj.id);
            }
        };

        const storeQuestRef = (questId, type, objRef, target = null, part = null) => {
            if (!QUEST_TRACKER_TreeObjRef[questId]) {
                QUEST_TRACKER_TreeObjRef[questId] = { paths: {} };
            }
            
            if (type === 'paths' && target) {
                if (!QUEST_TRACKER_TreeObjRef[questId][type][target]) {
                    QUEST_TRACKER_TreeObjRef[questId][type][target] = {};
                }
                if (part) {
                    QUEST_TRACKER_TreeObjRef[questId][type][target][part] = objRef;
                }
            } else {
                QUEST_TRACKER_TreeObjRef[questId][type] = objRef;
            }
        };

        const replaceImageSize = (imgsrc) => {
            return imgsrc.replace(/\/(med|original|max|min)\.(gif|jpg|jpeg|bmp|webp|png)(\?.*)?$/i, '/thumb.$2$3');
        };

        const getStatusColor = (status) => {
            switch (status) {
                case 'Unknown':
                    return '#A9A9A9';
                case 'Discovered':
                    return '#ADD8E6';
                case 'Started':
                    return '#87CEFA';
                case 'Ongoing':
                    return '#FFD700';
                case 'Completed':
                    return '#32CD32';
                case 'Completed By Someone Else':
                    return '#4682B4';
                case 'Failed':
                    return '#FF6347';
                case 'Time ran out':
                    return '#FF8C00';
                case 'Ignored':
                    return '#D3D3D3';
                default:
                    return '#CCCCCC';
            }
        };

        const trimText = (text, maxLength = 150) => {
            if (text.length > maxLength) {
                return text.slice(0, maxLength - 3) + '...';
            }
            return text;
        };

        const redrawQuestText = (questId) => {
            let pageObj = findObjs({ _type: 'page', name: QUEST_TRACKER_pageName })[0];
            if (!pageObj) {
                Utils.sendGMMessage(`Error: Page "${QUEST_TRACKER_pageName}" not found.`);
                return;
            }
            const pageId = pageObj.id;
            if (!QUEST_TRACKER_TreeObjRef[questId] || !QUEST_TRACKER_TreeObjRef[questId].text) {
                Utils.sendGMMessage(`Error: Text object for quest "${questId}" not found.`);
                return;
            }
            const textObjId = QUEST_TRACKER_TreeObjRef[questId].text;
            const textObj = getObj('text', textObjId);
            if (textObj) {
                const questData = QUEST_TRACKER_globalQuestData[questId];
                const isHidden = questData.hidden || false;
                const textLayer = isHidden ? 'gmlayer' : 'objects';
                const x = textObj.get('left');
                const y = textObj.get('top');
                textObj.remove();
                drawText(pageId, x, y, questData.name, '#000000', textLayer, TEXT_FONT_SIZE, 'Contrail One', questId);
            }
        };

        const updateQuestText = (questId, newText) => {
            if (!QUEST_TRACKER_TreeObjRef[questId] || !QUEST_TRACKER_TreeObjRef[questId].text) {
                return;
            }
            const textObjId = QUEST_TRACKER_TreeObjRef[questId].text;
            const textObj = getObj('text', textObjId);
            if (!textObj) {
                return;
            }
            textObj.set('text', newText);
            saveQuestTrackerData();
        };

        const updateQuestTooltip = (questId, newTooltip) => {
            if (!QUEST_TRACKER_TreeObjRef[questId] || !QUEST_TRACKER_TreeObjRef[questId].avatar) {
                return;
            }
            const avatarObjId = QUEST_TRACKER_TreeObjRef[questId].avatar;
            const avatarObj = getObj('graphic', avatarObjId);
            if (!avatarObj) {
                return;
            }
            const trimmedTooltip = trimText(newTooltip, 150);
            avatarObj.set('tooltip', trimmedTooltip);
            saveQuestTrackerData();
        };

        const updateQuestStatusColor = (questId, statusNumber) => {
            if (!QUEST_TRACKER_TreeObjRef[questId] || !QUEST_TRACKER_TreeObjRef[questId].rectangle) {
                return;
            }
            const rectangleObjId = QUEST_TRACKER_TreeObjRef[questId].rectangle;
            const rectangleObj = getObj('path', rectangleObjId);
            if (!rectangleObj) {
                return;
            }
            const statusName = statusMapping[statusNumber] || 'Unknown';
            const statusColor = getStatusColor(statusName);
            rectangleObj.set('stroke', statusColor);
            setTimeout(() => {
                redrawQuestText(questId);
            }, 500);
            saveQuestTrackerData();
        };


        const updateQuestVisibility = (questId, makeHidden) => {
            if (!QUEST_TRACKER_TreeObjRef[questId]) {
                return;
            }
            const questData = QUEST_TRACKER_globalQuestData[questId];
            if (!questData) {
                return;
            }
            const pageId = findObjs({ type: 'page', name: QUEST_TRACKER_pageName })[0].id;
            if (typeof makeHidden === 'string') {
                makeHidden = makeHidden.toLowerCase() === 'true';
            }
            const targetLayer = makeHidden ? 'gmlayer' : 'map';
            const avatarLayer = makeHidden ? 'gmlayer' : 'objects';
            for (const sourceQuestId in QUEST_TRACKER_TreeObjRef) {
                const pathsToQuest = QUEST_TRACKER_TreeObjRef[sourceQuestId]?.paths?.[questId];
                if (pathsToQuest) {
                    for (const segmentId in pathsToQuest) {
                        const pathObj = getObj('path', pathsToQuest[segmentId]);
                        if (pathObj) {
                            pathObj.set({
                                layer: targetLayer,
                                stroke: makeHidden ? '#CCCCCC' : '#000000'
                            });
                        }
                    }
                }
            }
            const elements = ['rectangle', 'avatar'];
            elements.forEach(element => {
                const objId = QUEST_TRACKER_TreeObjRef[questId][element];
                const obj = getObj(element === 'rectangle' ? 'path' : 'graphic', objId);
                if (obj) {
                    const layer = element === 'avatar' ? avatarLayer : targetLayer;
                    obj.set('layer', layer);
                }
            });
            setTimeout(() => {
                redrawQuestText(questId);
            }, 200);
            if (!makeHidden) {
                setTimeout(() => {
                    saveQuestTrackerData();
                }, 700);
            }
        };

        return {
            buildQuestTreeOnPage,
            updateQuestText,
            updateQuestTooltip,
            updateQuestStatusColor,
            updateQuestVisibility
        };
    })();

    const Rumours = (() => {
        const calculateRumoursByLocation = () => {
            let rumoursByLocation = {};
            Object.keys(QUEST_TRACKER_globalRumours).forEach(questId => {
                let questRumours = QUEST_TRACKER_globalRumours[questId] || {};
                Object.keys(questRumours).forEach(status => {
                    Object.keys(questRumours[status] || {}).forEach(location => {
                        let locationRumours = questRumours[status][location] || {};
                        if (!rumoursByLocation[location]) rumoursByLocation[location] = [];
                        Object.keys(locationRumours).forEach(rumourKey => {
                            const rumourText = locationRumours[rumourKey];
                            rumoursByLocation[location].push(rumourText);
                        });
                    });
                });
            });
            QUEST_TRACKER_rumoursByLocation = rumoursByLocation;
        };

        const sendRumours = (locationId, numberOfRumours) => {
            let allRumours = [];
            let locationTable = findObjs({ type: 'rollabletable', name: 'locations' })[0];
            if (!locationTable) {
                Utils.sendGMMessage('Error 04-02-01: Locations table not found.');
                return;
            }
            let locationItems = findObjs({ type: 'tableitem', rollabletableid: locationTable.id });
            let location = locationItems.find(loc => loc.get('weight').toString() === locationId.toString());
            if (!location) {
                Utils.sendGMMessage(`Error 04-02-02: Location with ID "${locationId}" not found.`);
                return;
            }
            const normalizedLocationId = location.get('name').toLowerCase();
            if (normalizedLocationId === 'everywhere') {
                allRumours = Object.values(QUEST_TRACKER_rumoursByLocation['everywhere'] || {}).map((rumour, index) => `${index}|${Utils.sanitizeInput(rumour, 'STRING')}`);
            } else {
                const locationRumoursObj = QUEST_TRACKER_rumoursByLocation[normalizedLocationId] || {};
                const everywhereRumoursObj = QUEST_TRACKER_rumoursByLocation['everywhere'] || {};
                const locationRumours = Object.values(locationRumoursObj).map(rumour => Utils.sanitizeInput(rumour, 'STRING'));
                const everywhereRumours = Object.values(everywhereRumoursObj).map(rumour => Utils.sanitizeInput(rumour, 'STRING'));
                locationRumours.forEach((rumour, index) => {
                    for (let i = 0; i < 3; i++) {
                        allRumours.push(`${index}|${rumour}`);
                    }
                });
                everywhereRumours.forEach((rumour, index) => {
                    allRumours.push(`${locationRumours.length + index}|${rumour}`);
                });
            }
            if (allRumours.length === 0) {
                Utils.sendGMMessage(`Error 04-02-03: No rumours available for this location.`);
                return;
            }
            let selectedRumours = [];
            while (selectedRumours.length < numberOfRumours && allRumours.length > 0) {
                let randomIndex = Math.floor(Math.random() * allRumours.length);
                let selectedRumour = allRumours[randomIndex];
                let [rumourKey, rumourText] = selectedRumour.split('|', 2);
                selectedRumours.push(rumourText);
                allRumours = allRumours.filter(rumour => !rumour.startsWith(`${rumourKey}|`));
            }
            selectedRumours.forEach(rumour => {
                sendChat('', "/desc " + rumour);
            });
        };

        const addRumourLocation = (newItem) => {
            const sanitizedLocation = Utils.sanitizeInput(newItem, 'STRING').toLowerCase();
            let locationTable = findObjs({ type: 'rollabletable', name: 'locations' })[0];
            if (!locationTable) {
                Utils.sendGMMessage('Error 04-04-01: Locations table not found.');
                return;
            }
            let locationItems = findObjs({ type: 'tableitem', rollabletableid: locationTable.id });
            let maxWeight = locationItems.reduce((max, item) => {
                return Math.max(max, item.get('weight'));
            }, 0);
            let newWeight = maxWeight + 1;
            let newLocation = createObj('tableitem', {
                rollabletableid: locationTable.id,
                name: newItem,
                weight: newWeight
            });
            if (newLocation) {
                Utils.sendGMMessage(`Success: Added new location "${newItem}" to the locations table with weight ${newWeight}.`);
            } else {
                Utils.sendGMMessage('Error 04-04-02: Failed to add new location.');
            }
        };

        const updateRumourLocation = (locationid, old, newItem) => {
            let locationTable = findObjs({ type: 'rollabletable', name: 'locations' })[0];
            if (!locationTable) {
                Utils.sendGMMessage('Error 04-05-01: Locations table not found.');
                return;
            }
            let location = findObjs({ type: 'tableitem', rollabletableid: locationTable.id }).find(item => item.get('weight') == locationid);
            if (!location) {
                Utils.sendGMMessage(`Error 04-05-02: Location with ID "${locationid}" not found.`);
                return;
            }
            const locationWeight = location.get('weight');
            const oldLocationName = old.toLowerCase();
            const newLocationName = newItem.toLowerCase();
            let foundAndUpdated = false;
            Object.keys(QUEST_TRACKER_globalRumours).forEach(questId => {
                const questRumours = QUEST_TRACKER_globalRumours[questId] || {};
                Object.keys(questRumours).forEach(status => {
                    const statusRumours = questRumours[status] || {};
                    if (statusRumours[oldLocationName]) {
                        Object.keys(statusRumours[oldLocationName]).forEach(rumourKey => {
                            const rumourText = statusRumours[oldLocationName][rumourKey];
                            Utils.handleFieldAction('update', `qt-update-${status}|${oldLocationName}`, questId, rumourKey, newLocationName, 'rumour', 'STRING', 'key');
                        });
                        foundAndUpdated = true;
                    }
                });
            });
            if (!foundAndUpdated) {
                Utils.sendGMMessage(`Notice: No instances of the location "${old}" were found to update, but the location name has been changed.`);
            }
            try {
                location.set('name', newItem, (err) => {
                    if (err) {
                        Utils.sendGMMessage(`Error 04-05-04: Failed to update location name due to: ${err.message}`);
                        return;
                    }
                    Utils.sendGMMessage(`All rumours updated to reflect new location name "${newItem}".`);
                    calculateRumoursByLocation();
                });
            } catch (error) {
                Utils.sendGMMessage(`Error 04-05-05: Exception encountered while updating location name: ${error.message}`);
            }
        };

        const removeRumourLocation = (locationid) => {
            let locationTable = findObjs({ type: 'rollabletable', name: 'locations' })[0];
            if (!locationTable) {
                Utils.sendGMMessage('Error 04-06-01: Locations table not found.');
                return;
            }
            let location = findObjs({ type: 'tableitem', rollabletableid: locationTable.id }).find(item => item.get('weight') == locationid);
            if (!location) {
                Utils.sendGMMessage(`Error 04-06-02: Location with ID "${locationid}" not found.`);
                return;
            }
            const locationName = location.get('name').toLowerCase();
            let foundAndDeleted = false;
            Object.keys(QUEST_TRACKER_globalRumours).forEach(questId => {
                const questRumours = QUEST_TRACKER_globalRumours[questId] || {};
                Object.keys(questRumours).forEach(status => {
                    const statusRumours = questRumours[status] || {};
                    if (statusRumours[locationName]) {
                        Object.keys(statusRumours[locationName]).forEach(rumourKey => {
                            Utils.handleFieldAction('remove', `qt-remove-${status}|${locationName}`, questId, rumourKey, 'force', 'rumour', 'OBJECT');
                            Utils.sendGMMessage(`Deleted rumour "${rumourKey}" associated with location "${locationName}" in quest "${questId}".`);
                        });
                        delete statusRumours[locationName];
                        foundAndDeleted = true;
                    }
                });
            });
            location.remove(() => {
                Utils.sendGMMessage(`Success: Location "${locationName}" with ID "${locationid}" has been removed.`);
                if (!foundAndDeleted) {
                    Utils.sendGMMessage(`Notice: No associated rumours found for the location "${locationName}".`);
                } else {
                    Utils.sendGMMessage(`All associated rumours for location "${locationName}" have been removed.`);
                }
                calculateRumoursByLocation(); // Recalculate rumours by location
            });
        };

        const getLocationNameById = (locationId) => {
            const locationTable = findObjs({ type: 'rollabletable', name: 'locations' })[0];
            if (!locationTable) {
                Utils.sendGMMessage('Error: Locations table not found.');
                return null;
            }
            const locationItems = findObjs({ type: 'tableitem', rollabletableid: locationTable.id });
            const locationItem = locationItems.find(item => item.get('weight').toString() === locationId.toString());
            if (!locationItem) {
                Utils.sendGMMessage(`Error: Location with ID "${locationId}" not found.`);
                return null;
            }
            return locationItem.get('name');
        };

        const getNewRumourId = () => {
            const existingRumourIds = [];
            Object.values(QUEST_TRACKER_globalRumours).forEach(quest => {
                Object.values(quest).forEach(category => {
                    Object.values(category).forEach(location => {
                        Object.keys(location).forEach(rumourId => {
                            const match = rumourId.match(/^rumour_(\d+)$/);
                            if (match) {
                                existingRumourIds.push(parseInt(match[1], 10));
                            }
                        });
                    });
                });
            });
            const highestRumourNumber = existingRumourIds.length > 0 ? Math.max(...existingRumourIds) : 0;
            const newRumourId = `rumour_${highestRumourNumber + 1}`;
            return newRumourId;
        };

        const removeAllRumoursForQuest = (questId) => {
            Utils.handleFieldAction('remove', `qt-remove-ROOTOBJECT|${questId}`, questId, questId, 'force', 'rumour', 'OBJECT');
            Utils.sendGMMessage(`Success: All rumours associated with Quest "${questId}" have been removed.`);
            calculateRumoursByLocation();
        };

        const cleanupRumoursJSON = () => {
            const cleanUpRecursive = (obj, questId, path = '') => {
                if (typeof obj !== 'object' || obj === null) return obj;
                Object.keys(obj).forEach(key => {
                    const currentPath = path ? `${path}|${key}` : key;
                    obj[key] = cleanUpRecursive(obj[key], questId, currentPath);
                    if (typeof obj[key] === 'object' && Object.keys(obj[key]).length === 0) {
                        Utils.handleFieldAction('remove', `qt-remove-${currentPath}`, questId, null, 'force', 'rumour', 'OBJECT');
                    }
                });
                return obj;
            };
            Object.keys(QUEST_TRACKER_globalRumours).forEach(questId => {
                cleanUpRecursive(QUEST_TRACKER_globalRumours[questId], questId);
            });
        };

        const getAllLocations = () => {
            let rollableTable = findObjs({ type: 'rollabletable', name: 'locations' })[0];
            if (!rollableTable) {
                Utils.sendGMMessage(`Error: Rollable table "${tableName}" not found.`);
                return [];
            }
            const tableItems = findObjs({ _type: 'tableitem', _rollabletableid: rollableTable.id });
            const locations = tableItems.map(item => item.get('name'));
            return locations;
        };

        return {
            calculateRumoursByLocation,
            sendRumours,
            addRumourLocation,
            updateRumourLocation,
            removeRumourLocation,
            getLocationNameById,
            getNewRumourId,
            removeAllRumoursForQuest,
            cleanupRumoursJSON,
            getAllLocations
        };
    })();

    const Menu = (() => {
        const generateGMMenu = () => {
            let menu = `<div style="${styles.menu}"><h3 style="margin-bottom: 10px;">Active Quests</h3>`;
            menu += showActiveQuests();
            menu += `<br><a style="${styles.button}" href="!qt-menu action=allquests">Show All Quests</a>`;
            menu += `<br><hr><h3 style="margin-bottom: 10px;">Active Rumours</h3>`;
            menu += showActiveRumours();
            menu += `<br><a style="${styles.button}" href="!qt-menu action=allrumours">Show All Rumours</a>`;
            menu += `<br><hr><a style="${styles.button} ${styles.floatRight}" href="!qt-menu action=config">Configuration</a>`;
            menu += `</div>`;
            menu = menu.replace(/[\r\n]/g, ''); 
            Utils.sendGMMessage(menu);
        };

        const showActiveQuests = () => {
            const activeStatuses = [2, 3, 4];
            let AQMenu = "";
            const activeQuests = QUEST_TRACKER_globalQuestArray.filter(quest => {
                const statusName = Quest.getStatusNameByQuestId(quest.id, QUEST_TRACKER_globalQuestArray);
                return activeStatuses.includes(quest.weight) || activeStatuses.includes(parseInt(statusMapping[quest.weight]));
            });
            if (activeQuests.length === 0) {
                AQMenu += `<ul>
                    <li style="${styles.overflow}">
                        <span style="${styles.floatLeft}"><small>No Active Quests</small></span>
                    </li>
                </ul>`;
            } else {
                AQMenu += `<ul style="${styles.list}">`;
                activeQuests.forEach(quest => {
                    let questData = QUEST_TRACKER_globalQuestData[quest.id];
                    if (questData) {
                        questData = Object.keys(questData).reduce((acc, key) => {
                            acc[key.toLowerCase()] = questData[key];
                            return acc;
                        }, {});

                        if (questData.name) {
                            AQMenu += `
                            <li style="${styles.overflow}">
                                <span style="${styles.floatLeft}"><small>${questData.name}</small></span>
                                <span style="${styles.floatRight}">
                                    <a style="${styles.button}" href="!qt-menu action=quest|id=${quest.id}">Inspect</a>
                                </span>
                            </li>`;
                        } else {
                            log(`Error 05-02-01: Quest data for "${quest.id}" is missing or incomplete.`);
                        }
                    }
                });
                AQMenu += `</ul>`;
            }
            return AQMenu;
        };

        const showActiveRumours = () => {
            let menu = "";
            let locationTable = findObjs({ type: 'rollabletable', name: 'locations' })[0];
            if (locationTable) {
                let locationItems = findObjs({ type: 'tableitem', rollabletableid: locationTable.id });
                locationItems.sort((a, b) => a.get('weight') - b.get('weight')).forEach(location => {
                    let locationName = location.get('name');
                    let locationKey = locationName.toLowerCase();
                    let locationWeight = location.get('weight');
                    let rumourCount = QUEST_TRACKER_rumoursByLocation[locationKey] ? Object.keys(QUEST_TRACKER_rumoursByLocation[locationKey]).length : 0;
                    let everywhereRumourCount = QUEST_TRACKER_rumoursByLocation['everywhere'] ? Object.keys(QUEST_TRACKER_rumoursByLocation['everywhere']).length : 0;
                    let displayRumourCount = locationKey !== 'everywhere' && everywhereRumourCount > 0
                        ? `${rumourCount} (+${everywhereRumourCount})`
                        : `${rumourCount}`;
                    let totalRumourCount = locationKey === 'everywhere' ? rumourCount : rumourCount + everywhereRumourCount;
                    if (rumourCount > 0 || locationKey === 'everywhere') {
                        menu += `
                        <li style="${styles.column}">
                            <span style="${styles.floatLeft}">${locationName}<br><small>${displayRumourCount} Rumours</small></span>
                            <span style="${styles.floatRight}">
                                <a style="${styles.button}" href="!qt-rumours action=send|location=${locationWeight}|number=?{How Many Rumours? (Max: ${totalRumourCount})|1}">Show</a>
                            </span>
                        </li>`;
                    }
                });
            }
            return menu;
        };

        const showAllQuests = () => {
            let menu = `<div style="${styles.menu}"><h3 style="margin-bottom: 10px;">All Quests</h3>`;
            if (Object.keys(QUEST_TRACKER_globalQuestData).length === 0) {
                menu += `
                    <p>There doesn't seem to be any Quests, you need to create a quest or Import from the Handouts.</p>
                `;
            } else {
                let groupedQuestsByVisibility = {
                    visible: {},
                    hidden: {}
                };
                QUEST_TRACKER_globalQuestArray.forEach(quest => {
                    let questData = QUEST_TRACKER_globalQuestData[quest.id];
                    if (questData) {
                        questData = Object.keys(questData).reduce((acc, key) => {
                            acc[key.toLowerCase()] = questData[key];
                            return acc;
                        }, {});
                        const visibilityGroup = questData.hidden ? 'hidden' : 'visible';
                        if (!groupedQuestsByVisibility[visibilityGroup][quest.weight]) {
                            groupedQuestsByVisibility[visibilityGroup][quest.weight] = [];
                        }
                        groupedQuestsByVisibility[visibilityGroup][quest.weight].push(quest);
                    }
                });
                const generateQuestList = (groupName, quests) => {
                    menu += `<h3 style="margin-top: 20px;">${groupName} Quests</h3>`;
                    Object.keys(quests).sort((a, b) => a - b).forEach(weight => {
                        menu += `<h4>${statusMapping[weight]}</h4><ul style="${styles.list}">`;
                        quests[weight].forEach(quest => {
                            let questData = QUEST_TRACKER_globalQuestData[quest.id];
                            if (questData) {
                                questData = Object.keys(questData).reduce((acc, key) => {
                                    acc[key.toLowerCase()] = questData[key];
                                    return acc;
                                }, {});
                                if (questData.name) {
                                    menu += `
                                    <li style="${styles.overflow}">
                                        <span style="${styles.floatLeft}"><small>${questData.name}</small></span>
                                        <span style="${styles.floatRight}">
                                            <a style="${styles.button}" href="!qt-menu action=quest|id=${quest.id}">Inspect</a>
                                            <a style="${styles.button} ${styles.smallButton}" href="!qt-quest action=removequest|id=${quest.id}|confirmation=?{Type DELETE into this field to confirm deletion of this quest|}">-</a>
                                        </span>
                                    </li>`;
                                } else {
                                    log(`Error 05-04-01: Quest data for "${quest.id}" is missing or incomplete.`);
                                }
                            }
                        });
                        menu += `</ul>`;
                    });
                };
                generateQuestList('Visible', groupedQuestsByVisibility.visible);
                generateQuestList('Hidden', groupedQuestsByVisibility.hidden);
            }
            menu += `
                <br><hr>
                <span style="${styles.floatRight}">
                    <a style="${styles.button}" href="!qt-quest action=addquest">Add New Quest</a>
                </span>
                <br><hr>
                <a style="${styles.button}" href="!qt-menu action=main">Back to Main Menu</a>
            </div>`;
            menu = menu.replace(/[\r\n]/g, ''); 
            Utils.sendGMMessage(menu);
        };

        const showAllRumours = () => {
            let menu = `<div style="${styles.menu}"><h3 style="margin-bottom: 10px;">All Rumours</h3>`;
            menu += `<p>This menu displays all the rumours currently associated with quests in the game. Use the options below to navigate through the locations and statuses to add new rumours or modify existing ones.</p>`;
            if (Object.keys(QUEST_TRACKER_globalQuestData).length === 0) {
                menu += `
                    <p>There are no quests available. You need to create a quest or import quests from the handouts.</p>
                `;
            } else {
                Object.keys(QUEST_TRACKER_globalQuestData).forEach(questId => {
                    let rumourCount = 0;
                    let questRumours = QUEST_TRACKER_globalRumours[questId] || {};
                    Object.keys(questRumours).forEach(status => {
                        let locationRumours = questRumours[status] || {};
                        Object.keys(locationRumours).forEach(location => {
                            rumourCount += Object.keys(locationRumours[location] || {}).length;
                        });
                    });
                    let questData = QUEST_TRACKER_globalQuestData[questId] || {};
                    let questName = questData.name || `Quest: ${questId}`;
                    menu += `<div style="${styles.column}">
                        <span style="${styles.floatLeft}">${questName}<br><small>${rumourCount} rumours</small></span>
                        <span style="${styles.floatRight}">
                            <a style="${styles.button}" href="!qt-menu action=showQuestRumours|questId=${questId}">Show</a>
                        </span>
                    </div>`;
                });
            }
            menu += `
                <br><hr>
                <a style="${styles.button} ${styles.floatRight}" href="!qt-menu action=main">Back to Main Menu</a>
            </div>`;
            menu = menu.replace(/[\r\n]/g, ''); 
            Utils.sendGMMessage(menu);
        };


        const showQuestRumourByStatus = (questId) => {
            let questData = QUEST_TRACKER_globalQuestData[questId];
            const questDisplayName = questData && questData.name ? questData.name : `Quest: ${questId}`;
            let menu = `<div style="${styles.menu}"><h3 style="margin-bottom: 10px;">Rumours for ${questDisplayName}</h3>`;
            menu += `<p>${questData.description}</p>`;
            const questRumours = QUEST_TRACKER_globalRumours[questId] || {};
            const allStatuses = Object.values(statusMapping);
            if (allStatuses.length > 0) {
                menu += `<br><hr><table style="width:100%;">`;
                allStatuses.forEach(status => {
                    const rumoursByLocation = questRumours[status.toLowerCase()] || {};
                    const rumourCount = Object.values(rumoursByLocation).reduce((count, locationRumours) => {
                        return count + Object.keys(locationRumours).length;
                    }, 0);
                    menu += `
                    <tr>
                        <td>${status}<br><small>${rumourCount} rumours</small></td>
                        <td style="${styles.floatRight}">
                            <a style="${styles.button}" href="!qt-menu action=showRumourDetails|questId=${questId}|status=${status.toLowerCase()}">Show</a>
                        </td>
                    </tr>`;
                });
                menu += `</table><br>`;
            } else {
                menu += `
                    <p>There are no rumours available; either refresh the data, or start adding manually.</p>
                    <br><hr>
                    <a style="${styles.button}" href="!qt-menu action=locations">Location Management</a>
                    <br><hr>
                    <a style="${styles.button}" href="!qt-import">Import Quest and Rumour Data</a>
                `;
            }
            menu += `
                <br><hr>
                <span style="${styles.floatRight}">
                    <a style="${styles.button}" href="!qt-menu action=allrumours">All Rumours</a>
                    &nbsp;
                    <a style="${styles.button}" href="!qt-menu action=main">Main Menu</a>
                </span>
                <br><hr>
            </div>`;
            menu = menu.replace(/[\r\n]/g, ''); 
            Utils.sendGMMessage(menu);
        };

        const showRumourDetails = (questId, statusId) => {
            const questData = QUEST_TRACKER_globalQuestData[questId];
            const questDisplayName = questData && questData.name ? questData.name : `Quest: ${questId}`;
            const statusName = statusMapping[statusId] || statusId;
            let menu = `<div style="${styles.menu}"><h3 style="margin-bottom: 10px;">Rumours for ${questDisplayName}</h3><h3>Status: ${statusName}</h3>`;
            menu += `<p>This menu displays all the rumours currently associated with ${questDisplayName} under the status "${statusName}". Use the options below to update, add, or remove rumours.</p><p>To add new lines into the rumours use &#37;NEWLINE&#37;. To add in quotation marks you need to use &amp;quot;.</p><br><hr>`;

            const locationTable = findObjs({ type: 'rollabletable', name: 'locations' })[0];
            if (!locationTable) {
                menu += `
                    <p>Error 05-07-01: Locations table not found. Please check if the table exists in the game.</p>
                    <br><hr>
                    <a style="${styles.button}" href="!qt-menu action=locations">Location Management</a>
                    <br><hr>
                    <a style="${styles.button}" href="!qt-import">Import Quest and Rumour Data</a>
                </div>`;
                Utils.sendGMMessage(menu.replace(/[\r\n]/g, ''));
                return;
            }

            const locationItems = findObjs({ type: 'tableitem', rollabletableid: locationTable.id });
            const locationMapping = {};
            locationItems.forEach(location => {
                const locationName = location.get('name');
                const sanitizedLocationName = Utils.sanitizeString(locationName.toLowerCase());
                locationMapping[sanitizedLocationName] = { 
                    originalName: locationName, 
                    sanitizedName: sanitizedLocationName,
                    weight: location.get('weight')
                };
            });

            const questRumours = QUEST_TRACKER_globalRumours[questId] || {};
            const rumoursByStatus = questRumours[statusId.toLowerCase()] || {};

            Object.keys(locationMapping).forEach(sanitizedLocationName => {
                const { originalName, weight } = locationMapping[sanitizedLocationName];
                const locationRumours = rumoursByStatus[sanitizedLocationName] || {};
                menu += `<h4>${originalName}</h4><table style="width:100%;">`;
                if (Object.keys(locationRumours).length > 0) {
                    Object.keys(locationRumours).forEach(rumourId => {
                        const rumourText = locationRumours[rumourId];
                        let trimmedRumourText = rumourText.substring(0, 50);
                        let rumourTextSanitized = rumourText
                            .replace(/"/g, '&quot;')
                            .replace(/%NEWLINE%|<br>/g, ' | ');
                        let rumourInputSanitized = rumourText
                            .replace(/"/g, '&quot;')
                            .replace(/<br>/g, '%NEWLINE%');
                        menu += `
                        <tr>
                            <td><small style="${styles.rumour}">${trimmedRumourText}</small></td>
                            <td style="${styles.smallButtonContainer}">
                                <img style="${styles.button} ${styles.smallButtonMagnifier}" src="https://s3.amazonaws.com/files.d20.io/images/408852025/dSbfzo-MbnFFePocX86p-w/max.png" width="12px" height="12px" title="${rumourTextSanitized}">
                            </td>
                            <td style="${styles.smallButtonContainer}">
                                <a style="${styles.button} ${styles.smallButton}" href="!qt-rumours action=update|questId=${questId}|status=${statusId.toLowerCase()}|location=${weight}|rumourId=${rumourId}|new=?{Update Rumour|${rumourInputSanitized}}">c</a>
                            </td>
                            <td style="${styles.smallButtonContainer}">
                                <a style="${styles.button} ${styles.smallButton} ${styles.marginRight}" href="!qt-rumours action=remove|questId=${questId}|status=${statusId.toLowerCase()}|location=${weight}|rumourId=${rumourId}">-</a>
                            </td>
                        </tr>`;
                    });
                } else {
                    menu += `
                    <tr>
                        <td colspan="3"><small>No rumours</small></td>
                    </tr>`;
                }
                menu += `
                <tr style="border-top: 1px solid #ddd">
                    <td></td>
                    <td colspan="3" style="${styles.smallButtonAdd}">
                        <a style="${styles.button} ${styles.smallButton}" href="!qt-rumours action=add|questId=${questId}|status=${statusId.toLowerCase()}|location=${weight}|new=?{Enter New Rumour}">+</a>
                    </td>
                </tr>
                </table>`;
            });
            menu += `
                <br><hr>
                <span style="${styles.floatRight}">
                    <a style="${styles.button}" href="!qt-menu action=showQuestRumours|questId=${questId}">By Status</a>
                    &nbsp;
                    <a style="${styles.button}" href="!qt-menu action=allrumours">All Rumours</a>
                    &nbsp;
                    <a style="${styles.button}" href="!qt-menu action=main">Main Menu</a>
                </span>
                <br><hr>
            </div>`;
            menu = menu.replace(/[\r\n]/g, ''); 
            Utils.sendGMMessage(menu);
        };

        const showQuestDetails = (questId) => {
            let quest = QUEST_TRACKER_globalQuestData[questId];
            if (!quest) {
                Utils.sendGMMessage(`Error 05-08-01: Quest "${questId}" not found.`);
                return;
            }
            let statusName = Quest.getStatusNameByQuestId(questId, QUEST_TRACKER_globalQuestArray);
            quest = Utils.normalizeKeys(quest);
            quest.prerequisites = Array.isArray(quest.prerequisites) ? quest.prerequisites : [];
            quest.mutuallyexclusive = Array.isArray(quest.mutuallyexclusive) ? quest.mutuallyexclusive : [];
            quest.children = Array.isArray(quest.children) ? quest.children : [];
            let hiddenStatus = quest.hidden ? 'Yes' : 'No';
            let hiddenStatusTorF = quest.hidden ? 'true' : 'false';
            let menu = `
                <div style="${styles.menu}">
                    <h3 style="margin-bottom: 10px;">${quest.name || 'Unnamed Quest'}</h3>
                    <p>${quest.description || 'No description available.'}</p>
                    <span style="${styles.floatRight}">
                        <a style="${styles.button}" href="!qt-quest action=update|field=name|current=${questId}|old=${quest.name || ''}|new=?{Title|${quest.name || ''}}">Edit Title</a>
                        &nbsp;
                        <a style="${styles.button}" href="!qt-quest action=update|field=description|current=${questId}|old=${quest.description || ''}|new=?{Description|${quest.description || ''}}">Edit Description</a>
                    </span>
                    <table style="width:100%;">
                        ${formatListWithDropdown(quest.prerequisites, "Prerequisites", "prerequisites", questId, ["mutuallyexclusive", "children"])}
                        ${formatListWithDropdown(quest.mutuallyexclusive, "Mutually Exclusive", "mutuallyexclusive", questId, ["prerequisites", "children"])}
                        ${formatListWithDropdown(quest.children, "Children", "children", questId, ["prerequisites", "mutuallyexclusive"])}
                    </table>
                    <h4 style="${styles.bottomBorder} ${styles.topMargin}">Status</h4><br>
                    <span>${statusName}</span>
                    <span style="${styles.floatRight}">
                        <a style="${styles.button}" href="!qt-quest action=update|field=status|current=${questId}|new=?{Change Status${Object.keys(statusMapping).map(key => `|${statusMapping[key]},${key}`).join('')}}">Change</a>
                    </span>
                    <h4 style="${styles.bottomBorder} ${styles.topMargin}">Hidden</h4><br>
                    <span>${hiddenStatus}</span>
                    <span style="${styles.floatRight}">
                        <a style="${styles.button}" href="!qt-quest action=update|field=hidden|current=${questId}|old=${hiddenStatusTorF}|new=?{Is Quest Hidden?|Yes,true|No,false}">Change</a>
                    </span>
                    ${formatAutocompleteListWithDates('autoadvance', questId, statusMapping)}
                    <br><hr>
                    <a style="${styles.button}" href="!qt-menu action=main">Back to Main Menu</a>
                </div>`;
            menu = menu.replace(/[\r\n]/g, '');
            Utils.sendGMMessage(menu);
        };

        const manageRumourLocations = () => {
            let menu = `<div style="${styles.menu}"><h3 style="margin-bottom: 10px;">Manage Rumour Locations</h3>`;
            let locationTable = findObjs({ type: 'rollabletable', name: 'locations' })[0];
            if (!locationTable) {
                menu += `<p>Error 05-09-01: Locations table not found. Please check if the table exists in the game.</p></div>`;
                Utils.sendGMMessage(menu.replace(/[\r\n]/g, ''));
                return;
            }
            let locationItems = findObjs({ type: 'tableitem', rollabletableid: locationTable.id });
            let uniqueLocations = new Set();
            locationItems.sort((a, b) => a.get('weight') - b.get('weight')).forEach(location => {
                let locationName = location.get('name');
                let locationKey = locationName.toLowerCase();
                let locationId = location.get('weight');
                if (!uniqueLocations.has(locationKey)) {
                    uniqueLocations.add(locationKey);
                    let rumourCount = QUEST_TRACKER_rumoursByLocation[locationKey] ? Object.keys(QUEST_TRACKER_rumoursByLocation[locationKey]).length : 0;
                    let showButtons = !(locationId === 1 || locationName.toLowerCase() === 'everywhere');
                    menu += `<li style="${styles.column}">
                                <span style="${styles.floatLeft}">${locationName}<br><small>${rumourCount} Rumours</small></span>
                                <span style="${styles.floatRight}">`;
                    if (showButtons) {
                        menu += `<a style="${styles.button} ${styles.smallButton}" href="!qt-rumours action=editLocationName|locationId=${locationId}|old=${locationName}|new=?{Update Location Name|${locationName}}">c</a>
                                 <a style="${styles.button} ${styles.smallButton}" href="!qt-rumours action=removeLocation|locationId=${locationId}|confirmation=?{Type DELETE to confirm removal of this location|}">-</a>`;
                    }
                    menu += `</span></li>`;
                }
            });
            menu += `<br><a style="${styles.button}" href="!qt-rumours action=addLocation|new=?{New Location Name}">Add New Location</a>`;
            menu += `<br><hr><a style="${styles.button}" href="!qt-menu action=config">Back to Configuration</a></div>`;
            Utils.sendGMMessage(menu.replace(/[\r\n]/g, ''));
        };

        const formatListWithDropdown = (list, label, questField, questId, relatedFields = []) => {
            list = Array.isArray(list) ? list : [];
            const availableQuests = Quest.getValidQuestsForDropdown(questId, relatedFields, list);
            let isDropdownDisabled = availableQuests.length === 0;
            let isSelectDisabled = availableQuests.length === 1;
            let buttonStyle = isDropdownDisabled ? `${styles.buttonDisabled}` : `${styles.button}`;
            let spanOrAnchor = isDropdownDisabled ? `span` : `a`;
            let dropdownContent = isSelectDisabled 
                ? availableQuests[0] 
                : `?{Choose ${label}${availableQuests.map(qId => {
                    let questItem = QUEST_TRACKER_globalQuestData[qId];
                    let questName = questItem.name.replace(/,/g, '&#44;').replace(/\|/g, '&#124;');
                    return `|${questName},${qId}`;
                }).join('')}}`;
            let tableRows = list.map(item => {
                let questItem = QUEST_TRACKER_globalQuestData[item];
                let questName = questItem ? questItem.name : item;
                return `
                    <tr>
                        <td>${questName}</td>
                        <td style="${styles.smallButtonContainer}">
                            <${spanOrAnchor} style="${buttonStyle} ${styles.smallButton}" href="!qt-quest action=update|field=${questField}|current=${questId}|old=${item}|new=${dropdownContent}">c</${spanOrAnchor}>
                        </td>
                        <td style="${styles.smallButtonContainer}">
                            <a style="${styles.button} ${styles.smallButton}" href="!qt-quest action=remove|field=${questField}|current=${questId}|new=${item}">-</a>
                        </td>
                    </tr>`;
            }).join('');
            let addRow = `
                <tr style="${styles.topBorder}">
                    <td></td>
                    <td colspan="2" style="${styles.smallButtonContainer}">
                        <${spanOrAnchor} style="${buttonStyle} ${styles.smallButton}" href="!qt-quest action=add|field=${questField}|current=${questId}|new=${dropdownContent}">+</${spanOrAnchor}>
                    </td>
                </tr>`;
            if (list.length === 0) {
                tableRows = `
                    <tr>
                        <td style="${styles.smallerText}"><em>&lt;none&gt;</em></td>
                        <td colspan="2">
                            &nbsp;
                        </td>
                    </tr>`;
            }
            return `
                <tr>
                    <td colspan="3"><h4 style="${styles.bottomBorder} ${styles.topMargin}">${label}</h4></td>
                </tr>
                ${tableRows}
                ${addRow}
            `;
        };

        const formatAutocompleteListWithDates = (fieldName, questId, statusMapping) => {
            let questData = QUEST_TRACKER_globalQuestData[questId];
            let fieldData = questData[fieldName] || {};
            let isDropdownDisabled = Object.keys(statusMapping).length === 0;
            let buttonStyle = isDropdownDisabled ? `${styles.buttonDisabled}` : `${styles.button}`;
            let spanOrAnchor = isDropdownDisabled ? `span` : `a`;
            let fieldDataLowercaseKeys = Object.keys(fieldData).reduce((acc, key) => {
                acc[key.toLowerCase()] = fieldData[key];
                return acc;
            }, {});
            let tableRows = Object.keys(statusMapping).map(statusKey => {
                let statusName = statusMapping[statusKey];
                let dateValue = fieldDataLowercaseKeys[statusName.toLowerCase()] || "No Date";
                let changeDateContent = `?{Change Date for ${statusName}|${dateValue}}`;

                if (fieldDataLowercaseKeys[statusName.toLowerCase()]) {
                    return `
                        <tr>
                            <td>${statusName}<br><small>${dateValue}</small></td>
                            <td style="${styles.smallButtonContainer}">
                                <${spanOrAnchor} style="${buttonStyle} ${styles.smallButton}" href="!qt-quest action=update|field=${fieldName}|current=${questId}|old=${statusName}|new=${changeDateContent}">c</${spanOrAnchor}>
                            </td>
                            <td style="${styles.smallButtonContainer}">
                                <a style="${styles.button} ${styles.smallButton}" href="!qt-quest action=remove|field=${fieldName}|current=${questId}|old=${statusName}|new=${dateValue}">-</a>
                            </td>
                        </tr>`;
                } else {
                    return `
                        <tr>
                            <td>${statusName}<br><small>${dateValue}</small></td>
                            <td colspan="2" style="${styles.smallButtonContainer}">
                                <${spanOrAnchor} style="${buttonStyle} ${styles.smallButton}" href="!qt-quest action=add|field=${fieldName}|current=${questId}|old=${statusName}|new=?{Add Date for ${statusName}}">+</${spanOrAnchor}>
                            </td>
                        </tr>`;
                }
            }).join('');
            return `
                <h4 style="${styles.bottomBorder} ${styles.topMargin}">${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}</h4><br>
                <table style="width:100%;">
                    ${tableRows}
                </table>`;
        };

        const adminMenu = () => {
            let menu = `<div style="${styles.menu}"><h3 style="margin-bottom: 10px;">Quest Tracker Configuration</h3>`;
            let RefreshImport = "Import";
            if (Object.keys(QUEST_TRACKER_globalQuestData).length !== 0) {
                RefreshImport = "Refresh";
            }
            menu += `<br><hr><a style="${styles.button}" href="!qt-config action=togglereadableJSON|value=${QUEST_TRACKER_readableJSON === true ? 'false' : 'true'}">Toggle Readable JSON (${QUEST_TRACKER_readableJSON === true ? 'on' : 'off'})</a>`;
            menu += `<br><a style="${styles.button}" href="!qt-menu action=manageRumourLocations">Manage Rumour Locations</a>`;
            menu += `<br><a style="${styles.button}" href="!qt-import">${RefreshImport} Quest and Rumour Data</a>`;
            menu += `<br><a style="${styles.button}" href="!qt-questtree action=build">Build Quest Tree Page</a>`;
            menu += `<br><hr><a style="${styles.button} ${styles.floatRight}" href="!qt-menu action=main">Back to Main Menu</a>`;
            menu += `</div>`;
            menu = menu.replace(/[\r\n]/g, ''); 
            Utils.sendGMMessage(menu);
        };

        return {
            generateGMMenu,
            showQuestDetails,
            showAllQuests,
            showAllRumours,
            showRumourDetails,
            showQuestDetails,
            showQuestRumourByStatus,
            manageRumourLocations,
            adminMenu

        };
    })();

    const handleInput = (msg) => {
        if (msg.type === 'api' && playerIsGM(msg.playerid) && msg.content === '!qt') {
            Menu.generateGMMenu();
            return;
        }
        if (msg.type !== 'api' || !playerIsGM(msg.playerid) || !msg.content.startsWith('!qt')) {
            return;
        }
        const args = msg.content.split(' ');
        const command = args.shift();
        const params = args.join(' ').split('|').reduce((acc, param) => {
            const [key, value] = param.split('=');
            if (key && value) {
                acc[key.trim()] = value.trim();
            }
            return acc;
        }, {});
        if (command === '!qt-quest') {
            const { action, field, current, old = '', new: newItem = '', id, confirmation } = params;
            let forceDataType = null;
            if (action === 'removequest' && confirmation !== 'DELETE') {
                Utils.sendGMMessage('Error 02-01: Confirmation is required to delete the quest. Please type DELETE to confirm.');
                return;
            }
            if (action === 'addquest') {
                Quest.addQuest();
                setTimeout(() => {
                    Menu.showAllQuests();
                }, 500);
            } else if (action === 'removequest') {
                Quest.removeQuest(id);
                setTimeout(() => {
                    Menu.showAllQuests();
                }, 500);
            } else if ((action === 'update' || action === 'add' || action === 'remove') && field === 'autoadvance') {
                forceDataType = 'DATE';
                if (action === 'remove') {
                    Utils.handleFieldAction('remove', `qt-remove-${field}|${old}`, current, old, 'force', 'quest', 'OBJECT');
                } else {
                    const dateToSet = Utils.sanitizeInput(newItem, 'DATE');
                    if (dateToSet) {
                        Utils.handleFieldAction(action, `qt-${action}-${field}|${old}`, current, old, dateToSet, 'quest', forceDataType, 'value');
                    } else {
                        Utils.sendGMMessage('Error 02-02: Invalid date format for "autoadvance".');
                    }
                }
                setTimeout(() => {
                    Menu.showQuestDetails(current);
                }, 500);
            } else if (field === 'status') {
                Quest.updateQuestStatus(current, parseInt(newItem, 10));
                QuestPageBuilder.updateQuestStatusColor(current, newItem);
                setTimeout(() => {
                    Menu.showQuestDetails(current);
                }, 500);
            } else {
                if (field === 'hidden') {
                    forceDataType = 'BOOLEAN';
                }
                else {
                    forceDataType = 'STRING';
                }
                switch (field) {
                    case 'children':
                    case 'prerequisites':
                    case 'mutuallyexclusive':
                        if (action === 'add' || action === 'remove') {
                            Quest.manageRelationship(action, field, current, newItem || old);
                        } else if (action === 'update') {
                            Quest.manageRelationship(action, field, current, old, newItem);
                        }
                        break;
                    default:
                        Utils.handleFieldAction(action, `qt-${action}-${field}`, current, old, newItem, 'quest', forceDataType, action === 'remove' ? 'key' : 'value');
                        break;
                }
                if (field === "name") {
                    QuestPageBuilder.updateQuestText(current, newItem);
                }
                else if (field === "description") {
                    QuestPageBuilder.updateQuestTooltip(current, newItem);
                }
                else if (field === 'hidden') {
                    QuestPageBuilder.updateQuestVisibility(current, newItem);
                }
                setTimeout(() => {
                    Menu.showQuestDetails(current);
                }, 500);
            }
        } else if (command === '!qt-rumours') {
            const params = {};
            msg.content.replace(/([a-zA-Z]+)=([^|]+)/g, (match, key, value) => {
                params[key.toLowerCase()] = value.trim();
            });
            const { action, questid, status, location, rumourid, new: newItem, number, locationid, old, confirmation } = params;
            if (!action) {
                Utils.sendGMMessage('Error 02-03: Action is required for rumour commands.');
                return;
            }
            const validActions = ['add', 'update', 'remove', 'addLocation', 'editLocationName', 'removeLocation', 'send'];
            if (!validActions.includes(action)) {
                Utils.sendGMMessage('Error 02-04: Invalid action specified.');
                return;
            }
            switch (action) {
                case 'send':
                    const numberOfRumours = parseInt(number, 10);
                    if (!location || isNaN(numberOfRumours)) {
                        Utils.sendGMMessage('Invalid location or number of rumours specified.');
                        return;
                    }
                    Rumours.sendRumours(location, numberOfRumours);
                    break;
                case 'add':
                case 'update':
                case 'remove':
                    let locationName = Rumours.getLocationNameById(location);
                    let sanitizedLocation = Utils.sanitizeString(Utils.sanitizeInput(locationName, 'STRING').toLowerCase());
                    if (!questid || !status || !location || (action !== 'remove' && !newItem)) {
                        Utils.sendGMMessage('Error 02-05: Missing required parameters for adding/updating/removing a rumour.');
                        return;
                    }
                    if (!locationName) {
                        Utils.sendGMMessage(`Error 02-05-02: Location with ID "${location}" not found.`);
                        return;
                    }
                    if (action === 'add') {
                        const statusPath = `qt-add-${status}`;
                        const locationPath = `qt-add-${status}|${sanitizedLocation}`;
                        if (!QUEST_TRACKER_globalRumours[questid]?.[status]) {
                            Utils.handleFieldAction('add', statusPath, questid, null, {}, 'rumour', 'OBJECT');
                        }
                        if (!QUEST_TRACKER_globalRumours[questid]?.[status]?.[sanitizedLocation]) {
                            Utils.handleFieldAction('add', locationPath, questid, null, {}, 'rumour', 'OBJECT');
                        }
                        const newRumourKey = Rumours.getNewRumourId();
                        if (!newRumourKey || typeof newRumourKey !== 'string') {
                            Utils.sendGMMessage('Error 02-07: Invalid rumour key generated.');
                            return;
                        }
                        const rumourObject = {};
                        rumourObject[newRumourKey] = newItem;
                        Utils.handleFieldAction('add', `qt-add-${status}|${sanitizedLocation}`, questid, newRumourKey, rumourObject[newRumourKey], 'rumour', 'OBJECT');
                        setTimeout(() => {
                            Menu.showRumourDetails(questid, status);
                        }, 500);
                    }
                    if (action === 'update') {
                        const field = `${status}|${sanitizedLocation}|${rumourid}`;
                        if (!newItem || typeof newItem !== 'string') {
                            Utils.sendGMMessage('Error 02-07: Invalid or missing new rumour text.');
                            return;
                        }
                        Utils.handleFieldAction('update', `qt-update-${field}`, questid, rumourid, newItem, 'rumour', 'STRING');
                        setTimeout(() => {
                            Menu.showRumourDetails(questid, status);
                        }, 500);
                    }
                    if (action === 'remove') {
                        const removalfield = `${status}|${sanitizedLocation}|${rumourid}`;
                        Utils.handleFieldAction('remove', `qt-remove-${removalfield}`, questid, rumourid, 'force', 'rumour', 'OBJECT');
                        Rumours.cleanupRumoursJSON();
                        setTimeout(() => {
                            Menu.showRumourDetails(questid, status);
                        }, 500);
                    }
                    break;
                case 'addLocation':
                    if (!newItem) {
                        Utils.sendGMMessage('Error 02-07: Missing location name for adding a new location.');
                        return;
                    }
                    const allLocations = Rumours.getAllLocations();
                    const sanitizedNewItem = Utils.sanitizeString(newItem.toLowerCase());
                    if (sanitizedNewItem === 'everywhere') {
                        Utils.sendGMMessage('Error 02-07-01: "Everywhere" is a reserved location name and cannot be added.');
                        return;
                    }
                    if (allLocations.some(loc => Utils.sanitizeString(loc.toLowerCase()) === sanitizedNewItem)) {
                        Utils.sendGMMessage(`Error 02-07-02: Location "${newItem}" already exists and cannot be added again.`);
                        return;
                    }
                    Rumours.addRumourLocation(newItem);
                    setTimeout(() => {
                        Menu.manageRumourLocations();
                    }, 500);
                    break;
                case 'editLocationName':
                    if (!locationid || !old || !newItem) {
                        Utils.sendGMMessage('Error 02-08: Missing required parameters for editing location name.');
                        return;
                    }
                    if (locationid === '1' || old.toLowerCase() === 'everywhere') {
                        Utils.sendGMMessage('Error 02-08-01: The location "Everywhere" or location ID 1 cannot be updated.');
                        return;
                    }
                    const existingLocations = Rumours.getAllLocations();
                    const sanitizedNewLocation = Utils.sanitizeString(newItem.toLowerCase());
                    if (existingLocations.some(loc => Utils.sanitizeString(loc.toLowerCase()) === sanitizedNewLocation)) {
                        Utils.sendGMMessage(`Error 02-08-02: Location "${newItem}" already exists. Cannot rename to an existing location.`);
                        return;
                    }
                    Rumours.updateRumourLocation(locationid, old, newItem);
                    setTimeout(() => {
                        Menu.manageRumourLocations();
                    }, 500);
                    break;
                case 'removeLocation':
                    if (!locationid || confirmation !== 'DELETE') {
                        Utils.sendGMMessage('Error 02-09: Confirmation required to delete location. Please type DELETE to confirm.');
                        return;
                    }
                    const locationToRemove = Rumours.getLocationNameById(locationid);
                    if (locationid === '1' || locationToRemove.toLowerCase() === 'everywhere') {
                        Utils.sendGMMessage('Error 02-09-01: The location "Everywhere" or location ID 1 cannot be removed.');
                        return;
                    }
                    Rumours.removeRumourLocation(locationid);
                    setTimeout(() => {
                        Menu.manageRumourLocations();
                    }, 500);
                    break;
                default:
                    Utils.sendGMMessage('Error 02-10: Invalid parameters for rumour action.');
                    break;
            }
        } else if (command === '!qt-menu') {
            const { action, id, questId, locationId, status } = params;
            if (!action || action === 'main') {
                Menu.generateGMMenu();
            } else if (action === 'config') {
                Menu.adminMenu();
            }else if (action === 'quest') {
                if (id) {
                    Menu.showQuestDetails(id);
                } else {
                    log(`Error 02-11: Quest ID is required for action 'quest'.`);
                }
            } else if (action === 'allquests') {
                Menu.showAllQuests();
            } else if (action === 'allrumours') {
                Menu.showAllRumours();
            } else if (action === 'showQuestRumours') {
                if (questId) {
                    Menu.showQuestRumourByStatus(questId);
                } else {
                    log(`Error 02-12: Quest ID is required for action 'showQuestRumours'.`);
                }
            } else if (action === 'showRumourDetails') {
                if (questId && status) {
                    Menu.showRumourDetails(questId, status);
                } else {
                    log(`Error 02-13: Quest ID and Status are required for action 'showRumourDetails'.`);
                }
            } else if (action === 'manageRumourLocations') {
                Menu.manageRumourLocations();
            } else {
                log(`Error 02-14: Unknown menu action: ${action}`);
            }
        } else if (command === '!qt-date') {
            const isPublic = params.public === 'true';
            const fromValue = params.from || 'Quest Tracker';
            const messageValue = params.message || null;
            switch (params.action) {
                case 'set':
                    Calendar.setCurrentDate(params.date, isPublic, fromValue, messageValue);
                    break;
                case 'advance':
                    if (params.unit === 'day') {
                        Calendar.modifyDate(1, isPublic, fromValue, messageValue);
                    } else if (params.unit === 'days') {
                        Calendar.modifyDate(parseInt(params.amount, 10), isPublic, fromValue, messageValue);
                    }
                    break;
                case 'retreat':
                    if (params.unit === 'day') {
                        Calendar.modifyDate(-1, isPublic, fromValue, messageValue);
                    } else if (params.unit === 'days') {
                        Calendar.modifyDate(-parseInt(params.amount, 10), isPublic, fromValue, messageValue);
                    }
                    break;
                default:
                    log(`Error 02-15: Unknown date command: ${params.action}`);
                    break;
            }
        } else if (command === '!qt-import') {
            Import.fullImportProcess();
        } else if (command === '!qt-config') {
            const { action, value } = params;
            if (action === 'togglereadableJSON'){
                Utils.togglereadableJSON(value);
                setTimeout(() => {
                    Menu.adminMenu();
                }, 500);
            }
        } else if (command === '!qt-questtree') {
            const { action, value } = params;
            if (action === 'build'){
                QuestPageBuilder.buildQuestTreeOnPage();
            }
        } 
        else {
            log(`Error 02-16: Unknown command: ${command}`);
        }
    };

return {
    loadQuestTrackerData,
    saveQuestTrackerData,
    handleInput,
    Import,
    Calendar,
    Quest,
    Rumours,
    QuestPageBuilder,
    Menu,
    initializeQuestTrackerState
};

})();

on('ready', function () {
    'use strict';
    QuestTracker.initializeQuestTrackerState();
    QuestTracker.loadQuestTrackerData();
    on('chat:message', function(msg) {
        QuestTracker.handleInput(msg);
    });
});
