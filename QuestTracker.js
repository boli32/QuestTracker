var QuestTracker = QuestTracker || (function () {
	'use strict';
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
				log('Error: Valid JSON structure not found after stripping.');
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
				Utils.sendGMMessage(`Error: Input is undefined or null.`);
				return null;
			}
			switch (type) {
				case 'STRING':
					if (typeof input !== 'string') {
						Utils.sendGMMessage(`Error: Expected a string, but received "${typeof input}".`);
						return null;
					}
					return input.replace(/<[^>]*>/g, '').replace(/["<>]/g, '').replace(/(\r\n|\n|\r)/g, '%NEWLINE%');
				case 'ARRAY':
					if (!Array.isArray(input)) {
						Utils.sendGMMessage(`Error: Expected an array, but received "${typeof input}".`);
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
						Utils.sendGMMessage(`Error: Expected an object, but received "${typeof input}".`);
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
					Utils.sendGMMessage(`Error: Unsupported type "${type}".`);
					return null;
			}
		};
		const extractFieldFromCommand = (command) => {
			if (command.includes('-') && command.split('-').length >= 3) {
				return command.split('-')[2].toLowerCase();
			}
			return null;
		};
		const updateHandoutField = (dataType = 'quest') => {
			const handoutName = dataType.toLowerCase() === 'rumour' ? QUEST_TRACKER_RumourHandoutName : QUEST_TRACKER_QuestHandoutName;
			const handout = findObjs({ type: 'handout', name: handoutName })[0];
			if (!handout) {
				log(`Error: Handout "${handoutName}" not found.`);
				return;
			}
			handout.get('gmnotes', (notes) => {
				const cleanedContent = Utils.stripJSONContent(notes);
				let data;
				try {
					data = JSON.parse(cleanedContent);
					data = normalizeKeys(data);
				} catch (error) {
					log(`Error: Failed to parse JSON data from GM notes: ${error.message}`);
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
						log(`Error: Failed to update GM notes for "${handoutName}": ${err.message}`);
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
			saveQuestTrackerData();
			if (dataType === 'rumours') {
				Rumours.calculateRumoursByLocation();
			}
		};
		const capitalize = (str) => {
			str.charAt(0).toUpperCase() + str.slice(1);
		};  
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
				Utils.sendGMMessage('Error: Expected a string input.');
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
			convertToArray,
			getStatusByName,
			togglereadableJSON,
			sanitizeString,
			runInBatches,
			initializeNestedPath
		};
	})();
	const Import = (() => {
		const Helpers = {
			importData: (handoutName, globalVarName, dataType) => {
				Utils.sendGMMessage(`Importing ${dataType} data. This might take some time. Please be patient...`);
				let handout = findObjs({ type: 'handout', name: handoutName })[0];
				if (!handout) {
					log(`Error: ${dataType} handout "${handoutName}" not found.`);
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
						if (globalVarName === 'QUEST_TRACKER_globalQuestData') {
							parsedData = Utils.normalizeKeys(parsedData);
							QUEST_TRACKER_globalQuestArray = [];
							Object.keys(parsedData).forEach((questId) => {
								const quest = parsedData[questId];
								quest.relationships = quest.relationships || { logic: 'AND', conditions: [] };
								QUEST_TRACKER_globalQuestArray.push({ id: questId, weight: quest.weight || 1 });
							});
							QUEST_TRACKER_globalQuestData = parsedData;
						} else if (globalVarName === 'QUEST_TRACKER_globalRumours') {
							parsedData = Utils.normalizeKeys(parsedData);
							Object.keys(parsedData).forEach((questId) => {
								Object.keys(parsedData[questId]).forEach((status) => {
									Object.keys(parsedData[questId][status]).forEach((location) => {
										let rumours = parsedData[questId][status][location];
										if (typeof rumours === 'object' && !Array.isArray(rumours)) {
											parsedData[questId][status][location] = rumours;
										} else {
											log(`Error: Rumours for location "${location}" under status "${status}" for quest "${questId}" is not in the correct key/value format.`);
											parsedData[questId][status][location] = {};
										}
									});
								});
							});
							QUEST_TRACKER_globalRumours = parsedData;
							Rumours.calculateRumoursByLocation();
							Rumours.cleanupRumoursJSON();
						}
						saveQuestTrackerData();
						Utils.sendGMMessage(`${dataType} data imported successfully.`);
					} catch (error) {
						log(`Error: Error parsing ${dataType} data: ${error.message}`);
					}
				});
			},
			syncQuestRollableTable: () => {
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
			},
			validateRelationships: (relationships, questId) => {
				const questName = questId.toLowerCase();
				const validateNestedConditions = (conditions) => {
					if (!Array.isArray(conditions)) return true;
					return conditions.every(condition => {
						if (typeof condition === 'string') {
							const lowerCondition = condition.toLowerCase();
							if (!QUEST_TRACKER_globalQuestData.hasOwnProperty(lowerCondition)) {
								Utils.sendGMMessage(`Error: Condition "${lowerCondition}" in quest "${questName}" does not exist in quest data.`);
								return false;
							}
							return true;
						} else if (typeof condition === 'object' && condition.logic && Array.isArray(condition.conditions)) {
							return validateNestedConditions(condition.conditions);
						}
						return false;
					});
				};
				const conditionsValid = validateNestedConditions(relationships.conditions || []);
				const mutuallyExclusive = Array.isArray(relationships.mutually_exclusive)
					? relationships.mutually_exclusive.map(exclusive => exclusive.toLowerCase())
					: [];
				mutuallyExclusive.forEach(exclusive => {
					if (!QUEST_TRACKER_globalQuestData.hasOwnProperty(exclusive)) {
						Utils.sendGMMessage(`Error: Mutually exclusive quest "${exclusive}" in quest "${questName}" does not exist in quest data.`);
					}
				});
			},
			cleanUpDataFields: () => {
				Object.keys(QUEST_TRACKER_globalQuestData).forEach(questId => {
					const quest = QUEST_TRACKER_globalQuestData[questId];
					Helpers.validateRelationships(quest.relationships || {}, questId);
				});
				saveQuestTrackerData();
				Utils.updateHandoutField('quest');
			}
		}
		const fullImportProcess = () => {
			Utils.sendGMMessage("Starting full import process. This may take some time...");
			Helpers.importData(QUEST_TRACKER_QuestHandoutName, 'QUEST_TRACKER_globalQuestData', 'Quest');
			Helpers.importData(QUEST_TRACKER_RumourHandoutName, 'QUEST_TRACKER_globalRumours', 'Rumour');
			Helpers.syncQuestRollableTable();
			Quest.cleanUpLooseEnds();
			Helpers.cleanUpDataFields();
			Quest.populateQuestsToAutoAdvance();
			Utils.sendGMMessage("Import completed and cleanup executed.");
		};

		return {
			fullImportProcess
		};
	})();
	const Quest = (() => {
		const H = {
			traverseConditions: (conditions, callback) => {
				conditions.forEach(condition => {
					if (typeof condition === 'string') {
						callback(condition);
					} else if (typeof condition === 'object' && condition.logic && Array.isArray(condition.conditions)) {
						H.traverseConditions(condition.conditions, callback);
						if (Array.isArray(condition.mutually_exclusive)) {
							condition.mutually_exclusive.forEach(exclusiveQuest => {
								callback(exclusiveQuest);
							});
						}
					}
				});
			},
			updateQuestStatus: (questId, status) => {
				const questTable = findObjs({ type: 'rollabletable', name: 'quests' })[0];
				if (!questTable) {
					return;
				}
				const items = findObjs({ type: 'tableitem', rollabletableid: questTable.id });
				const item = items.find(i => i.get('name') === questId);
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
			},
			removeQuestFromRollableTable: (questId) => {
				const questTable = findObjs({ type: 'rollabletable', name: 'quests' })[0];
				if (questTable) {
					const item = findObjs({ type: 'tableitem', rollabletableid: questTable.id })
						.find(i => i.get('name') === questId);
					if (item) {
						item.remove();
					}
				}
			},
			getExclusions: (questId) => {
				const questData = QUEST_TRACKER_globalQuestData[questId];
				if (!questData || !questData.relationships) {
					return [];
				}
				let exclusions = new Set();
				if (Array.isArray(questData.relationships.mutually_exclusive)) {
					questData.relationships.mutually_exclusive.forEach(exclusions.add, exclusions);
				}
				H.traverseConditions(questData.relationships.conditions || [], condition => {
					if (typeof condition === 'string') {
						exclusions.add(condition);
					}
				});
				return Array.from(exclusions);
			},
			modifyRelationshipObject: (currentRelationships, action, relationshipType, newItem, groupnum) => {
				switch (relationshipType) {
					case 'mutuallyExclusive':
						switch (action) {
							case 'add':
								currentRelationships.mutually_exclusive = typeof currentRelationships.mutually_exclusive === 'string' ? [currentRelationships.mutually_exclusive] : (currentRelationships.mutually_exclusive || []);
								if (!currentRelationships.mutually_exclusive.includes(newItem)) {
									currentRelationships.mutually_exclusive.push(newItem);
								}
								break;
							case 'remove':
								currentRelationships.mutually_exclusive = currentRelationships.mutually_exclusive.filter(
									exclusive => exclusive && exclusive !== newItem
								);
								break;
							default:
								break;
						}
						break;
					case 'single':
						if (!Array.isArray(currentRelationships.conditions)) {
							currentRelationships.conditions = [];
						}
						if (!currentRelationships.logic) {
							currentRelationships.logic = 'AND';
						}
						switch (action) {
							case 'add':
								const baseIndex = currentRelationships.conditions.findIndex(cond => typeof cond === 'object');
								if (baseIndex === -1) {
									currentRelationships.conditions.push(newItem);
								} else {
									currentRelationships.conditions.splice(baseIndex, 0, newItem);
								}
								break;
							case 'remove':
								currentRelationships.conditions = currentRelationships.conditions.filter(cond => cond !== newItem);
								break;
							default:
								break;
						}
						break;
					case 'group':
						if (groupnum === null || groupnum < 1) {
							return currentRelationships;
						}
						if (groupnum >= currentRelationships.conditions.length || typeof currentRelationships.conditions[groupnum] !== 'object') {
							currentRelationships.conditions[groupnum] = { logic: 'AND', conditions: [] };
						}
						const group = currentRelationships.conditions[groupnum];
						if (typeof group === 'object' && group.logic && Array.isArray(group.conditions)) {
							switch (action) {
								case 'add':
									if (!group.conditions.includes(newItem)) {
										group.conditions.push(newItem);
									}
									break;
								case 'remove':
									group.conditions = group.conditions.filter(cond => cond !== newItem);
									break;
								default:
									break;
							}
						}
						break;
					case 'logic':
						currentRelationships.logic = currentRelationships.logic === 'AND' ? 'OR' : 'AND';
						break;
					case 'grouplogic':
						if (groupnum !== null && groupnum >= 1 && groupnum < currentRelationships.conditions.length) {
							const group = currentRelationships.conditions[groupnum];
							if (typeof group === 'object' && group.logic) {
								group.logic = group.logic === 'AND' ? 'OR' : 'AND';
							}
						}
						break;
					case 'removegroup':
						if (groupnum !== null && groupnum >= 1 && groupnum < currentRelationships.conditions.length) {
							currentRelationships.conditions.splice(groupnum, 1);
						}
						break;
					case 'addgroup':
						currentRelationships.conditions.push({
							logic: 'AND',
							conditions: [newItem]
						});
						break;
					default:
						break;
				}
				return currentRelationships;
			},
			generateNewQuestId: () => {
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
				return `quest_${newQuestNumber}`;
			},
			removeQuestReferences: (questId) => {
				Object.keys(QUEST_TRACKER_globalQuestData).forEach(otherQuestId => {
					if (otherQuestId !== questId) {
						const otherQuestData = QUEST_TRACKER_globalQuestData[otherQuestId];
						if (!otherQuestData || !otherQuestData.relationships) return;
						const { conditions, mutually_exclusive } = otherQuestData.relationships;
						if (Array.isArray(conditions) && conditions.includes(questId)) {
							manageRelationship(otherQuestId, 'remove', 'single', questId);
						}
						if (Array.isArray(mutually_exclusive) && mutually_exclusive.includes(questId)) {
							manageRelationship(otherQuestId, 'remove', 'mutuallyExclusive', questId);
						}
						if (Array.isArray(conditions)) {
							conditions.forEach((condition, index) => {
								if (typeof condition === 'object' && Array.isArray(condition.conditions)) {
									if (condition.conditions.includes(questId)) {
										manageRelationship(otherQuestId, 'remove', 'group', questId, index);
									}
								}
							});
						}
					}
				});
			}
		};
		const manageRelationship = (questId, action, relationshipType, newItem = null, groupnum = null) => {
			let questData = QUEST_TRACKER_globalQuestData[questId];
			if (!questData) {
				return;
			}
			let currentRelationships = questData.relationships || { logic: 'AND', conditions: [], mutually_exclusive: [] };
			currentRelationships.conditions = currentRelationships.conditions || [];
			currentRelationships.mutually_exclusive = currentRelationships.mutually_exclusive || [];
			let updatedRelationships = H.modifyRelationshipObject(currentRelationships, action, relationshipType, newItem, groupnum);
			Utils.updateHandoutField('quest')
		};
		const getValidQuestsForDropdown = (questId) => {
			const exclusions = H.getExclusions(questId);
			const excludedQuests = new Set([questId, ...exclusions]);
			const validQuests = Object.keys(QUEST_TRACKER_globalQuestData).filter(qId => {
				return !excludedQuests.has(qId);
			});
			return validQuests;
		};
		const addQuest = () => {
			const newQuestId = H.generateNewQuestId();
			const defaultQuestData = {
				name: 'New Quest',
				description: 'Description',
				relationships: {},
				hidden: true,
				autoadvance: {}
			};
			const questTable = findObjs({ type: 'rollabletable', name: 'quests' })[0];
			QUEST_TRACKER_globalQuestData[newQuestId] = defaultQuestData;
			QUEST_TRACKER_globalQuestArray.push({ id: newQuestId, weight: 1 });
			if (questTable) {
				createObj('tableitem', {
					rollabletableid: questTable.id,
					name: newQuestId,
					weight: 1,
				});
			}
			Utils.updateHandoutField('quest')
		};
		const removeQuest = (questId) => {
			if (!QUEST_TRACKER_globalQuestData[questId]) {
				return;
			}
			H.removeQuestReferences(questId);
			H.removeQuestFromRollableTable(questId);
			Rumours.removeAllRumoursForQuest(questId);
			delete QUEST_TRACKER_globalQuestData[questId];
			QUEST_TRACKER_globalQuestArray = QUEST_TRACKER_globalQuestArray.filter(quest => quest.id !== questId);
			Utils.updateHandoutField('quest');
		};
		const cleanUpLooseEnds = () => {
			const processedPairs = new Set();
			Object.keys(QUEST_TRACKER_globalQuestData).forEach(questId => {
				const quest = QUEST_TRACKER_globalQuestData[questId];
				const mutuallyExclusiveQuests = quest.relationships?.mutually_exclusive || [];
				mutuallyExclusiveQuests.forEach(targetId => {
					const pairKey = [questId, targetId].sort().join('-');
					if (!processedPairs.has(pairKey)) {
						processedPairs.add(pairKey);
						const targetQuest = QUEST_TRACKER_globalQuestData[targetId];
						if (targetQuest) {
							const targetMutuallyExclusive = new Set(targetQuest.relationships?.mutually_exclusive || []);
							if (!targetMutuallyExclusive.has(questId)) {
								manageRelationship(targetId, 'add', 'mutuallyExclusive', questId);
								Utils.sendGMMessage(`Added missing mutually exclusive relationship from ${targetId} to ${questId}.`);
							}
						}
					}
				});
			});
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
		const getStatusNameByQuestId = (questId, questArray) => {
			let quest = questArray.find(q => q.id === questId);
			if (quest) {
				return statusMapping[quest.weight] || 'Unknown';
			}
			return 'Unknown';
		};
		const manageQuestObject = ({ action, field, current, old = '', newItem }) => {
			const quest = QUEST_TRACKER_globalQuestData[current];
			switch (field) {
				case 'status':
					quest.status = parseInt(newItem, 10);
					QuestPageBuilder.updateQuestStatusColor(current, newItem);
					break;
				case 'hidden':
					if (action === 'update') {
						quest.hidden = !quest.hidden;
						QuestPageBuilder.updateQuestVisibility(current, quest.hidden);
					}
					break;
				case 'autoadvance':
					if (action === 'add') {
						const correctCapitalization = Object.values(statusMapping).find(status => status.toLowerCase() === old.toLowerCase());
						if (correctCapitalization) {
							old = correctCapitalization;
						}
						quest.autoadvance = quest.autoadvance || {};
						quest.autoadvance[old] = newItem;
					} else if (action === 'remove') {
						old = old.toLowerCase();
						if (quest.autoadvance) {
							const keyToRemove = Object.keys(quest.autoadvance).find(key => key.toLowerCase() === old);
							if (keyToRemove) {
								delete quest.autoadvance[keyToRemove];
								if (Object.keys(quest.autoadvance).length === 0) {
									delete quest.autoadvance;
								}
							}
						}
					}
					break;
				case 'name':
					if (action === 'add') {
						quest.name = newItem;
						QuestPageBuilder.updateQuestText(current, newItem);
					} else if (action === 'remove') {
						quest.name = '';
					}
					break;
				case 'description':
					if (action === 'add') {
						quest.description = newItem;
						QuestPageBuilder.updateQuestTooltip(current, newItem);
					} else if (action === 'remove') {
						quest.description = '';
					}
					break;
				default:
					Utils.sendGMMessage(`Error: Unsupported field "${field}".`);
					break;
			}
			log(quest);
			// Utils.updateHandoutField('quest');
		};
		return {
			getStatusNameByQuestId,
			populateQuestsToAutoAdvance,
			getValidQuestsForDropdown,
			manageRelationship,
			addQuest,
			removeQuest,
			cleanUpLooseEnds,
			manageQuestObject
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
		const H = {
			getNewRumourId: () => {
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
			},
			getNewLocationId: (locationTable) => {
				let locationItems = findObjs({ type: 'tableitem', rollabletableid: locationTable.id });
				let maxWeight = locationItems.reduce((max, item) => {
					return Math.max(max, item.get('weight'));
				}, 0);
				let newWeight = maxWeight + 1;
				return newWeight;
			},
			removeRumours: (locationTable, locationid) => {
				const locationObject = findObjs({ type: 'tableitem', rollabletableid: locationTable.id }).find(item => item.get('weight') == locationid);
				if (!locationObject) return;
				const cleanData = Utils.sanitizeString(locationObject.get('name')).toLowerCase();
				Object.keys(QUEST_TRACKER_globalRumours).forEach(questId => {
					const questRumours = QUEST_TRACKER_globalRumours[questId] || {};
					Object.keys(questRumours).forEach(status => {
						const statusRumours = questRumours[status] || {};
						if (statusRumours[cleanData]) {
							Object.keys(statusRumours[cleanData]).forEach(rumourKey => {
							});
							delete statusRumours[cleanData];
						}
					});
				});
				Utils.updateHandoutField('rumour');
			}
		}
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
				Utils.sendGMMessage('Error: Locations table not found.');
				return;
			}
			let locationItems = findObjs({ type: 'tableitem', rollabletableid: locationTable.id });
			let location = locationItems.find(loc => loc.get('weight').toString() === locationId.toString());
			if (!location) {
				Utils.sendGMMessage(`Error: Location with ID "${locationId}" not found.`);
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
				Utils.sendGMMessage(`Error: No rumours available for this location.`);
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
		const removeAllRumoursForQuest = (questId) => {
			if (!QUEST_TRACKER_globalRumours[questId]) return;
			Object.keys(QUEST_TRACKER_globalRumours[questId]).forEach(status => {
				const statusRumours = QUEST_TRACKER_globalRumours[questId][status] || {};
				Object.keys(statusRumours).forEach(location => {
					delete statusRumours[location];
				});
				delete QUEST_TRACKER_globalRumours[questId][status];
			});
			delete QUEST_TRACKER_globalRumours[questId];
			Utils.updateHandoutField('rumour');
			calculateRumoursByLocation();
		};
		const cleanupRumoursJSON = () => {
			const cleanUpRecursive = (obj, questId, path = '') => {
				if (typeof obj !== 'object' || obj === null) return obj;
				Object.keys(obj).forEach(key => {
					const currentPath = path ? `${path}|${key}` : key;
					obj[key] = cleanUpRecursive(obj[key], questId, currentPath);
					if (typeof obj[key] === 'object' && Object.keys(obj[key]).length === 0) {
						delete obj[key];
						Utils.handleFieldAction('remove', `qt-remove-${currentPath}`, questId, null, 'force', 'rumour', 'OBJECT');
					}
				});
				return obj;
			};
			Object.keys(QUEST_TRACKER_globalRumours).forEach(questId => {
				cleanUpRecursive(QUEST_TRACKER_globalRumours[questId], questId);
			});
			Object.keys(QUEST_TRACKER_globalRumours).forEach(questId => {
				if (typeof QUEST_TRACKER_globalRumours[questId] === 'object' && Object.keys(QUEST_TRACKER_globalRumours[questId]).length === 0) {
					delete QUEST_TRACKER_globalRumours[questId];
					Utils.handleFieldAction('remove', `qt-remove-${questId}`, questId, null, 'force', 'rumour', 'OBJECT');
				}
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
		const manageRumourLocation = (action, newItem = null, locationid = null) => {
			const allLocations = Rumours.getAllLocations();
			let locationTable = findObjs({ type: 'rollabletable', name: 'locations' })[0];
			if (!locationTable) {
				Utils.sendGMMessage('Error: Locations table not found.');
				return;
			}
			switch (action) {
				case 'add':
					if (!newItem) return;
					if (allLocations.some(loc => Utils.sanitizeString(loc.toLowerCase()) === Utils.sanitizeString(newItem.toLowerCase()))) return;
					const newWeight = H.getNewLocationId(locationTable);
					if (newWeight === undefined || newWeight === null) return;
					let newLocation = createObj('tableitem', {
						rollabletableid: locationTable.id,
						name: newItem,
						weight: newWeight
					});
					break;
				case 'remove':
					if (!locationid || locationid === 1) return;
					let locationR = findObjs({ type: 'tableitem', rollabletableid: locationTable.id }).find(item => item.get('weight') == locationid);
					H.removeRumours(locationTable,locationid)
					locationR.remove();
					break;
				case 'update':
					if (allLocations.some(loc => Utils.sanitizeString(loc.toLowerCase()) === Utils.sanitizeString(newItem.toLowerCase())) || Utils.sanitizeString(newItem.toLowerCase()) === 'everywhere') return;
					let locationU = findObjs({ type: 'tableitem', rollabletableid: locationTable.id }).find(item => item.get('weight') == locationid);
					locationU.set('name', newItem);
					break;
			}
		};
		const manageRumourObject = ({ action, questId, newItem = '', status, location, rumourId = ''}) => {
			let locationString = getLocationNameById(location)
			const sanitizedLocation = locationString ? Utils.sanitizeString(locationString.toLowerCase()) : '';
			if (!QUEST_TRACKER_globalRumours[questId]) {
				QUEST_TRACKER_globalRumours[questId] = {};
			}
			if (!QUEST_TRACKER_globalRumours[questId][status]) {
				QUEST_TRACKER_globalRumours[questId][status] = {};
			}
			const questRumours = QUEST_TRACKER_globalRumours[questId];
			const statusRumours = questRumours[status];
			switch (action) {
				case 'add':
					if (!newItem) return;
					if (!statusRumours[sanitizedLocation]) {
						statusRumours[sanitizedLocation] = {};
					}
					const newRumourKey = rumourId === '' ? H.getNewRumourId() : rumourId;
					statusRumours[sanitizedLocation][newRumourKey] = newItem;
					break;
				case 'remove':
					if (!rumourId) return;
					if (statusRumours[sanitizedLocation] && statusRumours[sanitizedLocation][rumourId]) {
						delete statusRumours[sanitizedLocation][rumourId];
						if (Object.keys(statusRumours[sanitizedLocation]).length === 0) {
							delete statusRumours[sanitizedLocation];
						}
					}
					break;
				default:
					break;
			}
			Utils.updateHandoutField('rumour');
		};
		return {
			calculateRumoursByLocation,
			sendRumours,
			manageRumourLocation,
			getLocationNameById,
			removeAllRumoursForQuest,
			cleanupRumoursJSON,
			getAllLocations,
			manageRumourObject
		};
	})();
	const Menu = (() => {
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
			link: 'color: #007bff; text-decoration: underline; cursor: pointer;',
			treeStyle: 'display: inline-block; position: relative; text-align: center; margin-top: 0px;',
			questBox50: 'display: inline-block; width: 15px; height: 6px; padding: 5px; border: 1px solid #000; border-radius: 5px; background-color: #f5f5f5; text-align: center; position: relative; margin-right: 20px;',
			verticalLineStyle: 'position: absolute; width: 2px; background-color: black;',
			lineHorizontalRed: 'position: absolute; width: 24px; height: 2px; background-color: red; left: 57%;',
			lineHorizontal: 'position: absolute; height: 2px; background-color: black;',
			treeContainerStyle: 'position: relative; width: 100%; height: 100%; text-align: center; margin-top: 20px;',
			ulStyle: 'list-style: none; position: relative; padding: 0; margin: 0; display: block; text-align: center;',
			liStyle: 'display: inline-block; text-align: center; position: relative;',
			spanText: 'bottom: -1px; position: absolute; left: -1px; right: 0px;'
		};
		const Helpers = {
			showActiveQuests: () => {
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
								log(`Error: Quest data for "${quest.id}" is missing or incomplete.`);
							}
						}
					});
					AQMenu += `</ul>`;
				}
				return AQMenu;
			},
			showActiveRumours: () => {
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
			},
			generateQuestList: (groupName, quests) => {
				let menu = `<h3 style="margin-top: 20px;">${groupName} Quests</h3>`;
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
								log(`Error: Quest data for "${quest.id}" is missing or incomplete.`);
							}
						}
					});
					menu += `</ul>`;
				});
				return menu;
			},
			formatAutocompleteListWithDates: (fieldName, questId, statusMapping) => {
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
			},
			calculateStartingGroupNum: (conditions, isInLogicGroup = false) => {
				let count = 0;
				if (isInLogicGroup) return count;
				for (let i = 0; i < conditions.length; i++) {
					if (typeof conditions[i] === 'object' && conditions[i].logic) {
						break;
					}
					if (typeof conditions[i] === 'string') {
						count++;
					}
				}
				return count;
			},
			calculateGroupNum: (condition, conditions, groupnum) => {
				let count = 0;
				for (let i = 0; i < conditions.length; i++) {
					if (conditions[i] === condition) {
						break;
					}
					if (typeof conditions[i] === 'object' && conditions[i].logic) {
						count++;
					}
				}
				return groupnum + count;
			},
			formatConditions: (questId, conditions, parentLogic = 'AND', indent = false, groupnum = 0, isInLogicGroup = false) => {
				if (!Array.isArray(conditions)) return '';
				groupnum += Helpers.calculateStartingGroupNum(conditions, isInLogicGroup);
				return conditions.map((condition, index) => {
					const currentGroupNum = Helpers.calculateGroupNum(condition, conditions, groupnum);
					const displayIndex = index + 1;
					const isLastCondition = displayIndex === conditions.length;
					const isLastnonGroupCondition = (index + 1 < conditions.length && typeof conditions[index + 1] === 'object') || index === conditions.length - 1;
					const isOnlyGroupCondition = conditions.length === 1 && typeof conditions[0] === 'object';
					if (typeof condition === 'string') {
						return `
							<tr>
								${indent ? `<td>&nbsp;</td><td>` : `<td colspan="2">`}
									${Helpers.getQuestName(condition)}
								</td>
								<td style="${styles.smallButtonContainer}">
									<a style="${styles.button} ${styles.smallButton}" href="!qt-questrelationship currentquest=${questId}|oldquest=${condition}|action=update|type=${indent ? `group|groupnum=${currentGroupNum}` : `single`}|quest=?{Choose Quest|${Helpers.buildDropdownString(questId, condition)}}">c</a>
								</td>
								<td style="${styles.smallButtonContainer}">
									<a style="${styles.button} ${styles.smallButton}" href="!qt-questrelationship currentquest=${questId}|action=remove|type=${indent ? `group|groupnum=${currentGroupNum}|confirmation=DELETE` : `single`}|quest=${condition}">-</a>
								</td>
							</tr>
							${indent && isLastCondition ? `
							<tr>
								<td>&nbsp;</td>
								<td colspan="2">
									<small>Add Relationship</small>
								</td>
								<td style="${styles.smallButtonContainer}">
									<a style="${styles.button} ${styles.smallButton}" href="!qt-questrelationship currentquest=${questId}|action=add|type=group|groupnum=${currentGroupNum}|quest=?{Choose Quest|${Helpers.buildDropdownString(questId)}}">+</a>
								</td>
							</tr>
							` : ''}
							${!indent && isLastnonGroupCondition ? `
							<tr>
								<td colspan="3">
									<small>Add Relationship</small>
								</td>
								<td style="${styles.smallButtonContainer}">
									<a style="${styles.button} ${styles.smallButton}" href="!qt-questrelationship currentquest=${questId}|action=add|type=single|quest=?{Choose Quest|${Helpers.buildDropdownString(questId)}}">+</a>
								</td>
							</tr>
							` : ''}
						`;
					} else if (typeof condition === 'object' && condition.logic && Array.isArray(condition.conditions)) {
						const subLogic = Helpers.formatConditions(questId, condition.conditions, condition.logic, true, currentGroupNum, true);
						const reverseLogic = condition.logic === 'AND' ? 'OR' : 'AND';
						return `
							<tr>
								<td>&nbsp;</td><td>
									${condition.logic}
								</td>
								<td style="${styles.smallButtonContainer}">
									<a style="${styles.button} ${styles.smallButton}" href="!qt-questrelationship currentquest=${questId}|action=update|type=grouplogic|groupnum=${currentGroupNum}">c</a>
								</td>
								<td style="${styles.smallButtonContainer}">
									<a style="${styles.button} ${styles.smallButton}" href="!qt-questrelationship currentquest=${questId}|action=remove|type=removegroup|groupnum=${currentGroupNum}|confirmation=?{Type DELETE to confirm removal of this Group Logic|}">-</a>
								</td>
							</tr>
							${subLogic}
						`;
					}
				}).join('');
			},
			buildDropdownString: (questId) => {
				const validQuests = Quest.getValidQuestsForDropdown(questId);
				const dropdownString = validQuests.map(questId => {
					return `${Helpers.getQuestName(questId)},${questId}`;
				}).join('|');
				return dropdownString;
			},
			getQuestName: (questId) => {
				return QUEST_TRACKER_globalQuestData[questId]?.name || 'Unnamed Quest';
			},
			relationshipMenu: (questId) => {
				const quest = QUEST_TRACKER_globalQuestData[questId];
				let htmlOutput = "";
				if (!quest || !quest.relationships || !Array.isArray(quest.relationships.conditions) || quest.relationships.conditions.length === 0) {
					htmlOutput += `<br><table style="width:100%;">
										<tr style="${styles.topBorder}">
											<td colspan="3" style="${styles.topBorder}">
												<small>Add Relationship</small>
											</td>
											<td style="${styles.smallButtonContainer}">
												<a href="!qt-questrelationship currentquest=${questId}|action=add|type=single|quest=?{Choose Quest|${Helpers.buildDropdownString(questId)}}" style="${styles.button} ${styles.smallButton}">+</a>
											</td>
										</tr>
										<tr style="${styles.bottomBorder}">
											<td colspan="3"><small>Add Relationship Group</small></td>
											<td style="${styles.smallButtonContainer}">
												<a href="!qt-questrelationship currentquest=${questId}|action=add|type=addgroup|quest=?{Choose Quest|${Helpers.buildDropdownString(questId)}}" style="${styles.button} ${styles.smallButton}">+</a>
											</td>
										</tr>
									</table>`;
				} else {
					const conditionsHtml = Helpers.formatConditions(questId, quest.relationships.conditions, quest.relationships.logic || 'AND');
					htmlOutput += `
						<table style="width:100%;">
							${quest.relationships.conditions.length > 1 ? `<tr>
								<td colspan="3" style="${styles.topBorder}">
									${quest.relationships.logic || 'AND'}
								</td>
								<td style="${styles.smallButtonContainer}">
									<a href="!qt-questrelationship currentquest=${questId}|action=update|type=logic" style="${styles.button} ${styles.smallButton}">c</a>
								</td>
							</tr>` : ''}
							${conditionsHtml}
							<tr style="${styles.bottomBorder}">
								<td colspan="3">
									<small>Add Relationship Group</small>
								</td>
								<td style="${styles.smallButtonContainer}">
									<a href="!qt-questrelationship currentquest=${questId}|action=add|type=addgroup|quest=?{Choose Quest|${Helpers.buildDropdownString(questId)}}" style="${styles.button} ${styles.smallButton}">+</a>
								</td>
							</tr>
						</table>`;
				}
				let mutuallyExclusiveHtml = "";
				if (Array.isArray(quest.relationships.mutually_exclusive) && quest.relationships.mutually_exclusive.length > 0) {
					mutuallyExclusiveHtml += quest.relationships.mutually_exclusive.map(exclusive => `
						<tr>
							<td colspan="2">
								${Helpers.getQuestName(exclusive)}
							</td>
							<td style="${styles.smallButtonContainer}">
								<a href="!qt-questrelationship currentquest=${questId}|action=update|type=mutuallyexclusive|oldquest=${exclusive}|quest=?{Choose Quest|${Helpers.buildDropdownString(questId, exclusive)}}" style="${styles.button} ${styles.smallButton}">c</a>
							</td>
							<td style="${styles.smallButtonContainer}">
								<a href="!qt-questrelationship currentquest=${questId}|action=remove|type=mutuallyexclusive|quest=${exclusive}" style="${styles.button} ${styles.smallButton}">-</a>
							</td>
						</tr>
					`).join('');				
				} else {
					mutuallyExclusiveHtml += `<tr><td colspan="4"><small>No mutually exclusive quests available.</small></td></tr>`;
				}
				htmlOutput += `
					<br>
					<h4>Mutually Exclusive Quests</h4>
					<table style="width:100%;">
						${mutuallyExclusiveHtml}
						<tr>
							<td colspan="3"></td>
							<td style="${styles.smallButtonContainer}">
								<a href="!qt-questrelationship currentquest=${questId}|action=add|type=mutuallyexclusive|quest=?{Choose Quest|${Helpers.buildDropdownString(questId)}}" style="${styles.button} ${styles.smallButton}">+</a>
							</td>
						</tr>
					</table>`;
				return htmlOutput;
			}
		};
		const displayQuestRelationships = (questId) => {
			const d = {
				drawLine: (type, depth, half = false, flip = false) => {
					let style = "";
					switch (type) {
						case 'r':
							style = `${styles.lineHorizontalRed} top: ${26 + (depth * 26)}px`;
							return `<div style="${style}"></div>`;
						case 'v':
							style = `${styles.verticalLineStyle} height: 16px; left:${half ? 38 : 13}px; top:${38 + (depth * 16)}px`;
							return `<div style="${style}"></div>`;
						case 'h':
							style = `${styles.lineHorizontal} top: ${52 + (depth * 16)}px; width:${half ? 26 : 52}px; left:${flip ? 39 : 13}px`;
							return `<div style="${style}"></div>`;
					}
				},
				drawQuestBox: (content, columnInstructions = [], depth = false) => {
					const renderInstructions = columnInstructions.map(instruction => {
						const { type, depth, center, flip } = instruction;
						return d.drawLine(type, depth, center, flip);
					}).join('');
					return `
					<li style="${styles.liStyle}">
						<div style="${styles.questBox50} margin-top:${depth ? 40 : 20}px;">
							<span style="${styles.spanText}">${content}</span>
						</div>
						${renderInstructions}
					</li>`;
				}
			};
			const l = {
				checkMutualExclusivity: (questIds) => {
					const questData = QUEST_TRACKER_globalQuestData[questIds[0].toLowerCase()];
					if (!questData || !questData.relationships || !Array.isArray(questData.relationships.mutually_exclusive)) {
						return false;
					}
					const mutuallyExclusiveList = questData.relationships.mutually_exclusive;
					return mutuallyExclusiveList.includes(questIds[1]);
				},
				processConditions: (conditions, parentLogic = 'AND') => {
					const flattenedArray = [];
					if (!Array.isArray(conditions)) return flattenedArray;

					conditions.forEach((condition, index) => {
						if (typeof condition === 'string') {
							flattenedArray.push(condition);
							if (index < conditions.length - 1) {
								flattenedArray.push(parentLogic);
							}
						} else if (typeof condition === 'object' && condition.logic && Array.isArray(condition.conditions)) {
							condition.conditions.forEach((subCondition, subIndex) => {
								if (typeof subCondition === 'string') {
									flattenedArray.push(subCondition);
									if (subIndex < condition.conditions.length - 1) {
										flattenedArray.push(condition.logic);
									}
								}
							});
							if (index < conditions.length - 1) {
								flattenedArray.push(parentLogic);
							}
						}
					});
					return flattenedArray;
				},
				traverseLogicTree: (conditions, depth = 0, columnOffset = 0, depthMap = {}, parentLogic = 'AND') => {
					if (!depthMap[depth]) depthMap[depth] = [];
					let column = columnOffset;
					conditions.forEach((condition) => {
						if (typeof condition === 'string') {
							depthMap[depth].push({ type: 'quest', value: condition, logic: parentLogic, depth, column });
							column++;
						} else if (typeof condition === 'object' && condition.logic) {
							const subColumnsStart = column;
							const subColumnsEnd = column + condition.conditions.length - 1;
							const nextDepth = depth + 1;
							l.traverseLogicTree(condition.conditions, nextDepth, column, depthMap, condition.logic);
							depthMap[depth].push({ type: 'logic', logic: condition.logic, conditions: condition.conditions.map(cond => (typeof cond === 'string' ? cond : cond.conditions)), depth, column: subColumnsStart, endColumn: subColumnsEnd, });
							column = subColumnsEnd + 1;
						}
					});
					questLayers = depthMap;
					return { depthMap };
				},
				connectHorizontalLines: (depthMap, instructionsPerColumn) => {
					const depth0Elements = depthMap['0'] ? depthMap['0'] : [];
					if (depth0Elements.length + (depthMap['1'] ? depthMap['1'].length : 0) <= 1) return;
					const depth0Groups = depth0Elements.filter(el => el.type === 'logic')
						.map(el => ({ column: el.column, endColumn: el.endColumn, logic: el.logic, conditions: el.conditions }));
					depth0Groups.forEach(group => {
						for (let col = group.column; col < group.endColumn; col++) {
							if (!instructionsPerColumn[col]) instructionsPerColumn[col] = [];
							instructionsPerColumn[col].push({ type: 'h', depth: 0, center: false });
						}
					});
					if (!depthMap['1']) {
						const allColumns = depth0Elements.flatMap(el => el.type === 'logic' ? [el.column, el.endColumn] : [el.column]);
						const startColumn = Math.min(...allColumns);
						const endColumn = Math.max(...allColumns);
						for (let col = startColumn; col < endColumn; col++) {
							if (!instructionsPerColumn[col]) instructionsPerColumn[col] = [];
							instructionsPerColumn[col].push({ type: 'h', depth: 0, center: false });
						}
						const baseLogic = depthMap['0'].length && depthMap['0'][0].logic;
						return;
					}
					const allColumns = [
						...depth0Elements.flatMap(el => el.type === 'logic' ? [el.column, el.endColumn] : [el.column]),
						...depthMap['1'].map(el => el.column)
					];
					const lastDepth0LogicGroup = depth0Groups.reduce((lastGroup, group) => {
						return group.endColumn > lastGroup.endColumn ? group : lastGroup;
					}, { endColumn: -1, conditions: [] });
					const groupSize = lastDepth0LogicGroup.conditions.length;
					if (allColumns.length > 1) {
						const startColumn = Math.min(...allColumns);
						const endColumn = Math.max(...allColumns);
						for (let col = startColumn; col < endColumn; col++) {
							if (!instructionsPerColumn[col]) instructionsPerColumn[col] = [];
							let lineInstruction;
							if (col < endColumn - 1) {
								lineInstruction = { type: 'h', depth: 1, center: false };
							} else if (col === endColumn - 1) {
								lineInstruction = { type: 'h', depth: 1, center: groupSize % 2 === 0 };
							} else {
								continue;
							}
							
							instructionsPerColumn[col].push(lineInstruction);
						}
					}
				},
				addOrIndicators: (elements, instructionsPerColumn, depth) => {
					elements.forEach((element) => {
						if (element.type === 'logic' && element.logic === 'OR' && l.checkMutualExclusivity(element.conditions)) {
							for (let col = element.column; col < element.endColumn; col++) {
								if (!instructionsPerColumn[col]) instructionsPerColumn[col] = [];
								instructionsPerColumn[col].push({ type: 'r', depth, center: false });
							}
						}
					});
				},
				addCenterVerticalLine: (totalColumns, depth, instructionsPerColumn, startColumn = 0) => {
					const centerColumn = (totalColumns % 2 === 0)
						? startColumn + Math.floor((totalColumns - 1) / 2)
						: startColumn + Math.floor(totalColumns / 2);
					if (!instructionsPerColumn[centerColumn]) instructionsPerColumn[centerColumn] = [];
					instructionsPerColumn[centerColumn].push({ type: 'v', depth, center: totalColumns % 2 === 0 });
				},
				buildVerticalLines: (depthMap, instructionsPerColumn) => {
					if (Array.isArray(depthMap['0'])) {
						const totalColumns = depthMap['0'].reduce((count, element) => {
							if (element.type === 'quest') {
								return count + 1;
							} else if (element.type === 'logic' && Array.isArray(element.conditions)) {
								return count + element.conditions.length;
							}
							return count;
						}, 0);
						for (let column = 0; column < totalColumns; column++) {
							if (!instructionsPerColumn[column]) instructionsPerColumn[column] = [];
							instructionsPerColumn[column].push({ type: 'v', depth: 0, center: false });
						}
						if (!depthMap['1']) {
							l.addCenterVerticalLine(totalColumns, 1, instructionsPerColumn);
						}
					}
					if (Array.isArray(depthMap['1']) && Array.isArray(depthMap['0'])) {
						depthMap['0'].forEach((element) => {
							if (element.type === 'logic') {
								const startColumn = element.column;
								l.addCenterVerticalLine(element.conditions.length, 1, instructionsPerColumn, startColumn);
							} else if (element.type === 'quest') {
								const column = element.column;
								if (!instructionsPerColumn[column]) instructionsPerColumn[column] = [];
								instructionsPerColumn[column].push({type: 'v', depth: 1, center: false});
							}
						});
						const totalQuestCount = depthMap['0'].reduce((count, element) => {
							return count + (element.type === 'quest' ? 1 : element.conditions.length);
						}, 0);
						l.addCenterVerticalLine(totalQuestCount, 2, instructionsPerColumn);
					}
				},
				buildQuestTreeBottomUp: (relationships, currentDepth = 0) => {
					const { depthMap } = l.traverseLogicTree(relationships.conditions, currentDepth, 0, {}, relationships.logic || 'AND');
					const instructionsPerColumn = [];
					l.buildVerticalLines(depthMap, instructionsPerColumn);
					const depths = Object.keys(depthMap).sort((a, b) => b - a);
					depths.forEach((depth) => {
						const elements = depthMap[depth];
						l.addOrIndicators(elements, instructionsPerColumn, parseInt(depth));
					});
					l.connectHorizontalLines(depthMap, instructionsPerColumn);
					return instructionsPerColumn;
				}
			};
			const quest = QUEST_TRACKER_globalQuestData[questId];
			let questLayers = {};
			if (!quest || !quest.relationships || !Array.isArray(quest.relationships.conditions) || quest.relationships.conditions.length === 0) {
				return `<ul style="${styles.ulStyle}"> ${d.drawQuestBox("Q", [])} </ul>`;
			}
			else {
				const buildQuestListHTML = (flattenedLogic, columnInstructionsMap, depth = 0) => {
					let questListHTML = `<table style="width:100%;"><tr><td colspan="3"><ul style="${styles.ulStyle}">`;
					let questIndex = 0;
					flattenedLogic.forEach((item, index) => {
						const instructions = columnInstructionsMap[questIndex] || [];
						if (item !== 'AND' && item !== 'OR') {
							questListHTML += d.drawQuestBox('P', instructions, depth);
							questIndex++;
						}
					});
					questListHTML += '</ul>';
					return questListHTML;
				};
				const flattenedLogic = l.processConditions(quest.relationships.conditions, quest.relationships.logic || 'AND');
				const columnInstructionsMap = l.buildQuestTreeBottomUp(quest.relationships);
				let html = `<div style="${styles.treeContainerStyle}"><div style="${styles.treeStyle}">`;
				html += buildQuestListHTML(flattenedLogic, columnInstructionsMap, 0);
				html += `
					<ul style="${styles.ulStyle}">
						${d.drawQuestBox("Q", [], questLayers['1'] ? true : false)}
					</ul>
				`;
				html += '</div></div></td></tr></table>';
				return html;
			}
		};
		const generateGMMenu = () => {
			let menu = `<div style="${styles.menu}"><h3 style="margin-bottom: 10px;">Active Quests</h3>`;
			menu += Helpers.showActiveQuests();
			menu += `<br><a style="${styles.button}" href="!qt-menu action=allquests">Show All Quests</a>`;
			menu += `<br><hr><h3 style="margin-bottom: 10px;">Active Rumours</h3>`;
			menu += Helpers.showActiveRumours();
			menu += `<br><a style="${styles.button}" href="!qt-menu action=allrumours">Show All Rumours</a>`;
			menu += `<br><hr><a style="${styles.button} ${styles.floatRight}" href="!qt-menu action=config">Configuration</a>`;
			menu += `</div>`;
			menu = menu.replace(/[\r\n]/g, ''); 
			Utils.sendGMMessage(menu);
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
				menu += Helpers.generateQuestList('Visible', groupedQuestsByVisibility.visible);
				menu += Helpers.generateQuestList('Hidden', groupedQuestsByVisibility.hidden);
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
				<a style="${styles.button}" href="!qt-menu action=manageRumourLocations">Rumour Locations</a>
				&nbsp;
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
					<p>Error: Locations table not found. Please check if the table exists in the game.</p>
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
						let trimmedRumourText = String(rumourText).substring(0, 50);
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
								<a style="${styles.button} ${styles.smallButton}" href="!qt-rumours action=update|questid=${questId}|status=${statusId.toLowerCase()}|location=${weight}|rumourid=${rumourId}|new=?{Update Rumour|${rumourInputSanitized}}">c</a>
							</td>
							<td style="${styles.smallButtonContainer}">
								<a style="${styles.button} ${styles.smallButton} ${styles.marginRight}" href="!qt-rumours action=remove|questid=${questId}|status=${statusId.toLowerCase()}|location=${weight}|rumourid=${rumourId}">-</a>
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
						<a style="${styles.button} ${styles.smallButton}" href="!qt-rumours action=add|questid=${questId}|status=${statusId.toLowerCase()}|location=${weight}|new=?{Enter New Rumour}">+</a>
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
				Utils.sendGMMessage(`Error: Quest "${questId}" not found.`);
				return;
			}
			let statusName = Quest.getStatusNameByQuestId(questId, QUEST_TRACKER_globalQuestArray);
			quest = Utils.normalizeKeys(quest);
			let hiddenStatus = quest.hidden ? 'Yes' : 'No';
			let hiddenStatusTorF = quest.hidden ? 'true' : 'false';
			let relationshipsHtml = displayQuestRelationships(questId);
			let relationshipMenuHtml = Helpers.relationshipMenu(questId);
			let menu = `
				<div style="${styles.menu}">
					<h3 style="margin-bottom: 10px;">${quest.name || 'Unnamed Quest'}</h3>
					<p>${quest.description || 'No description available.'}</p>
					<span style="${styles.floatRight}">
						<a style="${styles.button}" href="!qt-quest action=update|field=name|current=${questId}|old=${quest.name || ''}|new=?{Title|${quest.name || ''}}">Edit Title</a>
						&nbsp;
						<a style="${styles.button}" href="!qt-quest action=update|field=description|current=${questId}|old=${quest.description || ''}|new=?{Description|${quest.description || ''}}">Edit Description</a>
					</span>
					<br>
					<h4 style="${styles.bottomBorder} ${styles.topMargin}">Relationships</h4>
					${relationshipsHtml}
					${relationshipMenuHtml}
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
					${Helpers.formatAutocompleteListWithDates('autoadvance', questId, statusMapping)}
					<br><hr>
					<a style="${styles.button}" href="!qt-menu action=allquests">Show All Quests</a> <a style="${styles.button}" href="!qt-menu action=main">Back to Main Menu</a>
				</div>`;
			menu = menu.replace(/[\r\n]/g, '');
			Utils.sendGMMessage(menu);
		};
		const manageRumourLocations = () => {
			let menu = `<div style="${styles.menu}"><h3 style="margin-bottom: 10px;">Manage Rumour Locations</h3>`;
			let locationTable = findObjs({ type: 'rollabletable', name: 'locations' })[0];
			if (!locationTable) {
				menu += `<p>Error: Locations table not found. Please check if the table exists in the game.</p></div>`;
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
			menu += `<br><hr><a style="${styles.button}" href="!qt-menu action=allrumours">Back to Rumours</a></div>`;
			Utils.sendGMMessage(menu.replace(/[\r\n]/g, ''));
		};
		const adminMenu = () => {
			let menu = `<div style="${styles.menu}"><h3 style="margin-bottom: 10px;">Quest Tracker Configuration</h3>`;
			let RefreshImport = "Import";
			if (Object.keys(QUEST_TRACKER_globalQuestData).length !== 0) {
				RefreshImport = "Refresh";
			}
			menu += `<br><hr><a style="${styles.button}" href="!qt-config action=togglereadableJSON|value=${QUEST_TRACKER_readableJSON === true ? 'false' : 'true'}">Toggle Readable JSON (${QUEST_TRACKER_readableJSON === true ? 'on' : 'off'})</a>`;
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
			switch (action) {
				case 'removequest':
					if (confirmation !== 'DELETE') {
						Utils.sendGMMessage('Error: Confirmation is required to delete the quest. Please type DELETE to confirm.');
						return;
					}
					Quest.removeQuest(id);
					setTimeout(() => {
						Menu.showAllQuests();
					}, 500);
					break;

				case 'addquest':
					Quest.addQuest();
					setTimeout(() => {
						Menu.showAllQuests();
					}, 500);
					break;

				case 'add':
				case 'remove':
				case 'update':
					switch (field) {
						case 'status':
							if (action === 'add' || action === 'remove') {
								Quest.manageQuestObject({ action, field, current, old, newItem });
								QuestPageBuilder.updateQuestStatusColor(current, newItem);
							}
							break;
						case 'name':
							if (action === 'add') {
								Quest.manageQuestObject({ action, field, current, old, newItem });
								QuestPageBuilder.updateQuestText(current, newItem);
							} else if (action === 'update') {
								Quest.manageQuestObject({ action: 'remove', field, current, old });
								Quest.manageQuestObject({ action: 'add', field, current, old, newItem });
							}
							break;
						case 'description':
							if (action === 'add') {
								Quest.manageQuestObject({ action, field, current, old, newItem });
								QuestPageBuilder.updateQuestTooltip(current, newItem);
							} else if (action === 'update') {
								Quest.manageQuestObject({ action: 'remove', field, current, old });
								Quest.manageQuestObject({ action: 'add', field, current, old, newItem });
							}
							break;
						case 'hidden':
							if (action === 'update') {
								Quest.manageQuestObject({ action, field, current });
								QuestPageBuilder.updateQuestVisibility(current, newItem);
							}
							break;
						case 'autoadvance':
							const dateToAdd = Utils.sanitizeInput(newItem, 'DATE');
							if (dateToAdd) {
								switch (action) {
									case 'add':
										Quest.manageQuestObject({ action, field, current, old, newItem: dateToAdd });
										break;
									case 'remove':
										Quest.manageQuestObject({ action, field, current, old });
										break;
									case 'update':
										Quest.manageQuestObject({ action: 'remove', field, current, old });
										Quest.manageQuestObject({ action: 'add', field, current, old, newItem: dateToAdd });
										break;
									default:
										Utils.sendGMMessage('Error: Unsupported action for "autoadvance".');
										break;
								}
							} else {
								Utils.sendGMMessage('Error: Invalid date format for "autoadvance".');
							}
							break;
						default:
							break;
					}
					setTimeout(() => {
						Menu.showQuestDetails(current);
					}, 500);
					break;
				default:
					break;
			}
		} else if (command === '!qt-questrelationship') {
			const { action, type, currentquest, quest, groupConditions, groupnum, oldquest, confirmation } = params;
			if (!action || !type) return;
			if (!currentquest) {
				Utils.sendGMMessage('Error: Current quest ID is required.');
				return;
			}
			const currentQuestData = QUEST_TRACKER_globalQuestData[currentquest];
			if (!currentQuestData) {
				Utils.sendGMMessage(`Error: Quest data for "${currentquest}" not found.`);
				return;
			}
			switch (action) {
				case 'add':
					switch (type) {
						case 'mutuallyexclusive':
							Quest.manageRelationship(currentquest, 'add', 'mutuallyExclusive', quest);
							Quest.manageRelationship(quest, 'add', 'mutuallyExclusive', currentquest);
							break;
						case 'single':
							Quest.manageRelationship(currentquest, 'add', 'single', quest);
							break;
						case 'group':
							Quest.manageRelationship(currentquest, 'add', 'group', quest, groupnum);
							break;
						case 'addgroup':
							Quest.manageRelationship(currentquest, 'add', 'addgroup', quest);
						default:
							Utils.sendGMMessage('Error: Unsupported relationship type.');
							break;
					}
					break;

				case 'remove':
					switch (type) {
						case 'mutuallyexclusive':
							Quest.manageRelationship(currentquest, 'remove', 'mutuallyExclusive', quest);
							Quest.manageRelationship(quest, 'remove', 'mutuallyExclusive', currentquest);
							break;
						case 'single':
							Quest.manageRelationship(currentquest, 'remove', 'single', quest);
							break;
						case 'group':
							Quest.manageRelationship(currentquest, 'remove', 'group', quest, groupnum);
							break;
						case 'removegroup':
							if (!groupnum || confirmation !== 'DELETE') {
								Utils.sendGMMessage('Error: Group number and confirmation are required for group relationship removal.');
								break;
							}
							Quest.manageRelationship(currentquest, 'remove', 'removegroup', null, groupnum);
							break;
						default:
							Utils.sendGMMessage('Error: Unsupported relationship type.');
							break;
					}
					break;

				case 'update':
					switch (type) {
						case 'mutuallyexclusive':
							Quest.manageRelationship(currentquest, 'remove', 'mutuallyExclusive', oldquest);
							Quest.manageRelationship(oldquest, 'remove', 'mutuallyExclusive', currentquest);
							Quest.manageRelationship(currentquest, 'add', 'mutuallyExclusive', quest);
							Quest.manageRelationship(quest, 'add', 'mutuallyExclusive', currentquest);
							break;
						case 'single':
							Quest.manageRelationship(currentquest, 'add', 'single', quest);
							Quest.manageRelationship(currentquest, 'remove', 'single', oldquest);
							break;
						case 'group':
							Quest.manageRelationship(currentquest, 'add', 'group', quest, groupnum);
							Quest.manageRelationship(currentquest, 'remove', 'group', oldquest, groupnum);
							break;
						case 'grouplogic':
							Quest.manageRelationship(currentquest, 'update', 'grouplogic', null, groupnum);
							break;
						case 'logic':
							Quest.manageRelationship(currentquest, 'update', 'logic', null);
							break;
						default:
							Utils.sendGMMessage('Error: Unsupported relationship type.');
							break;
					}
					break;
				default:
					Utils.sendGMMessage('Error: Unsupported action for quest relationship.');
					break;
			}

			setTimeout(() => {
				Menu.showQuestDetails(currentquest);
			}, 500);
		} else if (command === '!qt-rumours') {
			const { action, questid, status, location, rumourid, new: newItem, number, locationId, old, confirmation } = params;
			if (!action) return;
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
					if (!questid || !status || !location || (action !== 'remove' && !newItem)) {
						Utils.sendGMMessage('Error: Missing required parameters for adding/updating/removing a rumour.');
						return;
					}
					if (action === 'add') {
						Rumours.manageRumourObject({ action: 'add', questId: questid, newItem, status, location });
						setTimeout(() => {
							Menu.showRumourDetails(questid, status);
						}, 500);

					} else if (action === 'update') {
						if (!newItem || typeof newItem !== 'string') {
							Utils.sendGMMessage('Error: Invalid or missing new rumour text.');
							return;
						}
						Rumours.manageRumourObject({ action: 'remove', questId: questid, newItem: '', status, location, rumourId: rumourid });
						Rumours.manageRumourObject({ action: 'add', questId: questid, newItem, status, location, rumourId: rumourid });
						setTimeout(() => {
							Menu.showRumourDetails(questid, status);
						}, 500);
					} else if (action === 'remove') {
						Rumours.manageRumourObject({ action: 'remove', questId: questid, newItem: '', status, location, rumourId: rumourid });
						setTimeout(() => {
							Menu.showRumourDetails(questid, status);
						}, 500);
					}
					break;
				case 'addLocation':	
					Rumours.manageRumourLocation('add', newItem, null);
					setTimeout(() => {
						Menu.manageRumourLocations();
					}, 500);
					break;
				case 'editLocationName':
					Rumours.manageRumourLocation('update', newItem, locationId);
					setTimeout(() => {
						Menu.manageRumourLocations();
					}, 500);
					break;
				case 'removeLocation':
					if (!locationId || confirmation !== 'DELETE') {
						Utils.sendGMMessage('Error: Confirmation required to delete location. Please type DELETE to confirm.');
						return;
					}
					Rumours.manageRumourLocation('remove', null, locationId);
					setTimeout(() => {
						Menu.manageRumourLocations();
					}, 500);
					break;
				default:
					Utils.sendGMMessage('Error: Invalid parameters for rumour action.');
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
					log(`Error: Quest ID is required for action 'quest'.`);
				}
			} else if (action === 'allquests') {
				Menu.showAllQuests();
			} else if (action === 'allrumours') {
				Menu.showAllRumours();
			} else if (action === 'showQuestRumours') {
				if (questId) {
					Menu.showQuestRumourByStatus(questId);
				} else {
					log(`Error: Quest ID is required for action 'showQuestRumours'.`);
				}
			} else if (action === 'showRumourDetails') {
				if (questId && status) {
					Menu.showRumourDetails(questId, status);
				} else {
					log(`Error: Quest ID and Status are required for action 'showRumourDetails'.`);
				}
			} else if (action === 'manageRumourLocations') {
				Menu.manageRumourLocations();
			} else {
				log(`Error: Unknown menu action: ${action}`);
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
					log(`Error: Unknown date command: ${params.action}`);
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
			log(`Error: Unknown command: ${command}`);
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
