// Github:	 https://github.com/Roll20/roll20-api-scripts/tree/master/QuestTracker/
// By:		 Boli (Steven Wrighton): Professional Software Developer, Enthusiatic D&D Player since 1993.
// Contact:	 https://app.roll20.net/users/3714078/boli
// Readme	 https://github.com/Roll20/roll20-api-scripts/blob/master/QuestTracker/README.md


var QuestTracker = QuestTracker || (function () {
	'use strict';
	const getCalendarAndWeatherData = () => {
		let CALENDARS = {};
		let WEATHER = {};
		if (state.CalenderData) {
			if (state.CalenderData.CALENDARS) CALENDARS = state.CalenderData.CALENDARS;
			if (state.CalenderData.WEATHER) WEATHER = state.CalenderData.WEATHER;
		}
		if (state.QUEST_TRACKER?.calendar) Object.assign(CALENDARS, state.QUEST_TRACKER.calendar);
		return { CALENDARS, WEATHER };
	};
	const { CALENDARS, WEATHER } = getCalendarAndWeatherData();
	const frequencyMapping = {
		1: "Daily",
		2: "Weekly",
		3: "Monthly",
		4: "Yearly"
	}
	let QUEST_TRACKER_verboseErrorLogging = true;
	let QUEST_TRACKER_globalQuestData = {};
	let QUEST_TRACKER_globalQuestArray = [];
	let QUEST_TRACKER_globalRumours = {};
	let QUEST_TRACKER_Events = {};
	let QUEST_TRACKER_Calendar = {};
	let QUEST_TRACKER_Triggers = {};
	let QUEST_TRIGGER_DeleteList = [];
	let QUEST_TRACKER_versionChecking = {
		TriggerConversion: false,
		RumourConversion: false,
		EventConversion: false,
		EffectConversion: false
	}
	let QUEST_TRACKER_QuestHandoutName = "QuestTracker Quests";
	let QUEST_TRACKER_RumourHandoutName = "QuestTracker Rumours";
	let QUEST_TRACKER_EventHandoutName = "QuestTracker Events";
	let QUEST_TRACKER_WeatherHandoutName = "QuestTracker Weather";
	let QUEST_TRACKER_CalendarHandoutName = "QuestTracker Calendar";
	let QUEST_TRACKER_TriggersHandoutName = "QuestTracker Triggers";
	let QUEST_TRACKER_rumoursByLocation = {};
	let QUEST_TRACKER_readableJSON = true;
	let QUEST_TRACKER_pageName = "Quest Tree Page";
	let QUEST_TRACKER_TreeObjRef = {};
	let QUEST_TRACKER_questGrid = [];
	let QUEST_TRACKER_jumpGate = true;
	let QUEST_TRACKER_BASE_QUEST_ICON_URL = ''; // add your own image here.
	let QUEST_TRACKER_ROLLABLETABLE_QUESTS = "qt-quests";
	let QUEST_TRACKER_ROLLABLETABLE_QUESTGROUPS = "qt-quest-groups";
	let QUEST_TRACKER_ROLLABLETABLE_LOCATIONS = "qt-locations";
	let QUEST_TRACKER_calenderType = 'gregorian';
	let QUEST_TRACKER_currentDate = CALENDARS[QUEST_TRACKER_calenderType]?.defaultDate;
	let QUEST_TRACKER_defaultDate = CALENDARS[QUEST_TRACKER_calenderType]?.defaultDate;
	let QUEST_TRACKER_currentWeekdayName = "Thursday";
	let QUEST_TRACKER_Location = 'northern temperate';
	let QUEST_TRACKER_WeatherLocation = 'plains';
	let QUEST_TRACKER_CURRENT_WEATHER = "";
	let QUEST_TRACKER_FILTER = {};
	let QUEST_TRACKER_RUMOUR_FILTER = {};
	let QUEST_TRACKER_FILTER_Visbility = false;
	let QUEST_TRACKER_imperialMeasurements = {
		temperature: false,
		precipitation: false,
		wind: true,
		visibility: true
	};
	let QUEST_TRACKER_WEATHER_TRENDS = {
		dry: 0,
		wet: 0,
		heat: 0,
		cold: 0,
		wind: 0,
		humid: 0,
		visibility: 0,
		cloudy: 0
	};
	let QUEST_TRACKER_FORCED_WEATHER_TRENDS = {
		dry: false,
		wet: false,
		heat: false,
		cold: false,
		wind: false,
		humid: false,
		visibility: false,
		cloudy: false
	};
	let QUEST_TRACKER_HISTORICAL_WEATHER = {};
	let QUEST_TRACKER_WEATHER_DESCRIPTION = {};
	let QUEST_TRACKER_WEATHER = true;
	let QUEST_TRACKER_CACHED_QUEST_TREE = false;
	let QUEST_TRACKER_QuestStatuses = {};
	let QUEST_TRACKER_Flags = {};
	let QUEST_TRACKER_FlagStatuses = {};
	let QUEST_TRACKER_refreshLinkedQuestHandouts = () => {};
	const Statuses = (() => {
		const DEFAULT_STATUSES = {
			1: { name: 'Unknown', color: '#A9A9A9', active: false },
			2: { name: 'Discovered', color: '#ADD8E6', active: true },
			3: { name: 'Started', color: '#87CEFA', active: true },
			4: { name: 'Ongoing', color: '#FFD700', active: true },
			5: { name: 'Completed', color: '#32CD32', active: false },
			6: { name: 'Completed By Someone Else', color: '#4682B4', active: false },
			7: { name: 'Failed', color: '#FF6347', active: false },
			8: { name: 'Time ran out', color: '#FF8C00', active: false },
			9: { name: 'Ignored', color: '#D3D3D3', active: false }
		};
		const normalize = (statuses = {}) => {
			const source = statuses && Object.keys(statuses).length ? statuses : DEFAULT_STATUSES;
			return Object.entries(source).reduce((normalized, [id, status]) => {
				if (typeof status === 'string') {
					normalized[id] = {
						name: status,
						color: DEFAULT_STATUSES[id]?.color || '#CCCCCC',
						active: DEFAULT_STATUSES[id]?.active || false
					};
				} else {
					normalized[id] = {
						name: status?.name || DEFAULT_STATUSES[id]?.name || 'Unknown',
						color: status?.color || DEFAULT_STATUSES[id]?.color || '#CCCCCC',
						active: status?.active ?? DEFAULT_STATUSES[id]?.active ?? false
					};
				}
				return normalized;
			}, {});
		};
		const getAll = () => normalize(QUEST_TRACKER_QuestStatuses);
		const getName = (statusId) => {
			const statuses = getAll();
			if (statuses[statusId]) return statuses[statusId].name;
			const status = Object.values(statuses).find(definition => definition.name.toLowerCase() === `${statusId}`.toLowerCase());
			return status?.name || 'Unknown';
		};
		const getColor = (statusIdOrName) => {
			const statuses = getAll();
			if (statuses[statusIdOrName]) return statuses[statusIdOrName].color;
			const status = Object.values(statuses).find(definition => definition.name === statusIdOrName);
			return status?.color || '#CCCCCC';
		};
		const buildDropdown = () => Object.entries(getAll())
			.map(([id, status]) => `|${status.name},${id}`)
			.join('');
		const getActiveIds = () => Object.entries(getAll())
			.filter(([, status]) => status.active)
			.map(([id]) => parseInt(id, 10));
		const isComplete = (statusId) => getName(statusId).toLowerCase() === 'completed';
		const requiresPrerequisites = (statusId) => {
			const status = getAll()[statusId];
			const statusName = getName(statusId).toLowerCase();
			return !!status?.active || ['completed', 'completed by someone else'].includes(statusName);
		};
		const getNextId = () => {
			const ids = Object.keys(getAll()).map(id => parseInt(id, 10)).filter(id => !isNaN(id));
			return `${ids.length ? Math.max(...ids) + 1 : 1}`;
		};
		const getIdFromValue = (value) => {
			if (value === undefined || value === null || value === '') return null;
			const statuses = getAll();
			if (statuses[value]) return parseInt(value, 10);
			const match = Object.entries(statuses).find(([, status]) => status.name.toLowerCase() === `${value}`.toLowerCase());
			return match ? parseInt(match[0], 10) : null;
		};
		const isDefault = (id) => !!DEFAULT_STATUSES[id];
		const migrateLoadedData = () => {
			let changed = false;
			const normalizedStatuses = normalize(QUEST_TRACKER_QuestStatuses);
			if (!state.QUEST_TRACKER.questStatuses || JSON.stringify(QUEST_TRACKER_QuestStatuses) !== JSON.stringify(normalizedStatuses)) {
				QUEST_TRACKER_QuestStatuses = normalizedStatuses;
				changed = true;
			}
			QUEST_TRACKER_globalQuestData = QUEST_TRACKER_globalQuestData || {};
			QUEST_TRACKER_globalQuestArray = Array.isArray(QUEST_TRACKER_globalQuestArray) ? QUEST_TRACKER_globalQuestArray : [];
			const questArrayMap = QUEST_TRACKER_globalQuestArray.reduce((map, quest) => {
				if (quest?.id) map[quest.id] = quest.weight || 1;
				return map;
			}, {});
			const questTable = findObjs({ type: 'rollabletable', name: QUEST_TRACKER_ROLLABLETABLE_QUESTS })[0];
			const tableWeights = questTable
				? findObjs({ type: 'tableitem', rollabletableid: questTable.id }).reduce((weights, item) => {
					weights[item.get('name')] = item.get('weight') || 1;
					return weights;
				}, {})
				: {};
			const migratedQuestArray = Object.keys(QUEST_TRACKER_globalQuestData).map(questId => {
				const quest = QUEST_TRACKER_globalQuestData[questId] || {};
				return {
					id: questId,
					weight: questArrayMap[questId] || quest.weight || tableWeights[questId] || 1
				};
			});
			if (JSON.stringify(QUEST_TRACKER_globalQuestArray) !== JSON.stringify(migratedQuestArray)) {
				QUEST_TRACKER_globalQuestArray = migratedQuestArray;
				changed = true;
			}
			if (changed) saveQuestTrackerData();
		};
		const addStatus = (name, color = '#CCCCCC') => {
			const id = getNextId();
			QUEST_TRACKER_QuestStatuses[id] = { name, color, active: false };
			saveQuestTrackerData();
			return id;
		};
		const updateStatus = (id, field, value) => {
			if (!QUEST_TRACKER_QuestStatuses[id]) return false;
			if (field === 'name') QUEST_TRACKER_QuestStatuses[id].name = value;
			if (field === 'color') QUEST_TRACKER_QuestStatuses[id].color = value || '#CCCCCC';
			if (field === 'active') QUEST_TRACKER_QuestStatuses[id].active = value === true || value === 'true';
			saveQuestTrackerData();
			return true;
		};
		const removeStatus = (id) => {
			if (!QUEST_TRACKER_QuestStatuses[id] || isDefault(id)) return false;
			delete QUEST_TRACKER_QuestStatuses[id];
			QUEST_TRACKER_globalQuestArray.forEach(quest => {
				if (`${quest.weight}` === `${id}`) quest.weight = 1;
			});
			const questTable = findObjs({ type: 'rollabletable', name: QUEST_TRACKER_ROLLABLETABLE_QUESTS })[0];
			if (questTable) {
				findObjs({ type: 'tableitem', rollabletableid: questTable.id }).forEach(item => {
					if (`${item.get('weight')}` === `${id}`) item.set('weight', 1);
				});
			}
			saveQuestTrackerData();
			return true;
		};
		const resetStatuses = () => {
			QUEST_TRACKER_QuestStatuses = normalize();
			saveQuestTrackerData();
		};
		return {
			normalize,
			getAll,
			getName,
			getColor,
			buildDropdown,
			getActiveIds,
			isComplete,
			requiresPrerequisites,
			getIdFromValue,
			isDefault,
			migrateLoadedData,
			addStatus,
			updateStatus,
			removeStatus,
			resetStatuses
		};
	})();
	const loadQuestTrackerData = () => {
		initializeQuestTrackerState();
		QUEST_TRACKER_verboseErrorLogging = state.QUEST_TRACKER.verboseErrorLogging || true;
		QUEST_TRACKER_globalQuestData = state.QUEST_TRACKER.globalQuestData;
		QUEST_TRACKER_globalQuestArray = state.QUEST_TRACKER.globalQuestArray;
		QUEST_TRACKER_globalRumours = state.QUEST_TRACKER.globalRumours;
		QUEST_TRACKER_rumoursByLocation = state.QUEST_TRACKER.rumoursByLocation;
		QUEST_TRACKER_readableJSON = state.QUEST_TRACKER.readableJSON || true;
		QUEST_TRACKER_TreeObjRef = state.QUEST_TRACKER.TreeObjRef || {};
		QUEST_TRACKER_questGrid = state.QUEST_TRACKER.questGrid || [];
		QUEST_TRACKER_jumpGate = state.QUEST_TRACKER.jumpGate || true;
		QUEST_TRACKER_Events = state.QUEST_TRACKER.events || {};
		QUEST_TRACKER_Calendar = state.QUEST_TRACKER.calendar || {};
		QUEST_TRACKER_Triggers = state.QUEST_TRACKER.triggers || {};
		QUEST_TRACKER_versionChecking = state.QUEST_TRACKER.versionChecking || {
			TriggerConversion: false,
			RumourConversion: false,
			EventConversion: false,
			EffectConversion: false
		}
		QUEST_TRACKER_calenderType = state.QUEST_TRACKER.calenderType || 'gregorian';
		QUEST_TRACKER_currentDate = state.QUEST_TRACKER.currentDate || CALENDARS[QUEST_TRACKER_calenderType]?.defaultDate
		QUEST_TRACKER_defaultDate = state.QUEST_TRACKER.defaultDate || CALENDARS[QUEST_TRACKER_calenderType]?.defaultDate
		QUEST_TRACKER_Location = state.QUEST_TRACKER.location || 'northern temperate';
		QUEST_TRACKER_WeatherLocation = state.QUEST_TRACKER.weatherLocation || 'plains';
		QUEST_TRACKER_currentWeekdayName = state.QUEST_TRACKER.currentWeekdayName || 'Thursday';
		QUEST_TRACKER_FILTER = state.QUEST_TRACKER.filter || {};
		QUEST_TRACKER_RUMOUR_FILTER = state.QUEST_TRACKER.rumourFilter || {};
		QUEST_TRACKER_FILTER_Visbility = state.QUEST_TRACKER.filterVisibility || false;
		QUEST_TRACKER_WEATHER_TRENDS = state.QUEST_TRACKER.weatherTrends || {
			dry: 0,
			wet: 0,
			heat: 0,
			cold: 0,
			wind: 0,
			humid: 0,
			visibility: 0,
			cloudy: 0
		};
		QUEST_TRACKER_FORCED_WEATHER_TRENDS = state.QUEST_TRACKER.forcedWeatherTrends || {
			dry: false,
			wet: false,
			heat: false,
			cold: false,
			wind: false,
			humid: false,
			visibility: false,
			cloudy: false
		};
		QUEST_TRACKER_CURRENT_WEATHER = state.QUEST_TRACKER.currentWeather;
		QUEST_TRACKER_HISTORICAL_WEATHER = state.QUEST_TRACKER.historicalWeather || {};
		QUEST_TRACKER_WEATHER_DESCRIPTION = state.QUEST_TRACKER.weatherDescription || {};
		QUEST_TRACKER_WEATHER = state.QUEST_TRACKER.weather || true;
		QUEST_TRACKER_imperialMeasurements = state.QUEST_TRACKER.imperialMeasurements || {
			temperature: false,
			precipitation: false,
			wind: true,
			visibility: true
		};
		QUEST_TRACKER_CACHED_QUEST_TREE = state.QUEST_TRACKER.cachedQuestTree || false;
		QUEST_TRACKER_QuestStatuses = Statuses.normalize(state.QUEST_TRACKER.questStatuses);
		QUEST_TRACKER_Flags = state.QUEST_TRACKER.campaignFlags || state.QUEST_TRACKER.states || {};
		QUEST_TRACKER_FlagStatuses = Flags.normalizeStatuses(state.QUEST_TRACKER.flagStatuses || state.QUEST_TRACKER.stateStatuses);
		Statuses.migrateLoadedData();
		Flags.migrateLoadedData();
	};
	const checkVersion = () => {
		if (!QUEST_TRACKER_versionChecking.TriggerConversion) Triggers.convertAutoAdvanceToTriggers();
		if (!QUEST_TRACKER_versionChecking.RumourConversion) Rumours.convertRumoursToNewFormat();
		if (!QUEST_TRACKER_versionChecking.EventConversion) Calendar.convertEventsToNewFormat();
		if (!QUEST_TRACKER_versionChecking.EffectConversion) Triggers.convertEffectsToNewFormat();
	};
	const saveQuestTrackerData = () => {
		state.QUEST_TRACKER.verboseErrorLogging = QUEST_TRACKER_verboseErrorLogging;
		state.QUEST_TRACKER.globalQuestData = QUEST_TRACKER_globalQuestData;
		state.QUEST_TRACKER.globalQuestArray = QUEST_TRACKER_globalQuestArray;
		state.QUEST_TRACKER.globalRumours = QUEST_TRACKER_globalRumours;	
		state.QUEST_TRACKER.rumoursByLocation = QUEST_TRACKER_rumoursByLocation;
		state.QUEST_TRACKER.readableJSON = QUEST_TRACKER_readableJSON;
		state.QUEST_TRACKER.questGrid = QUEST_TRACKER_questGrid;
		state.QUEST_TRACKER.jumpGate = QUEST_TRACKER_jumpGate;
		state.QUEST_TRACKER.events = QUEST_TRACKER_Events;
		state.QUEST_TRACKER.calendar = QUEST_TRACKER_Calendar;
		state.QUEST_TRACKER.triggers = QUEST_TRACKER_Triggers;
		state.QUEST_TRACKER.versionChecking = QUEST_TRACKER_versionChecking;
		state.QUEST_TRACKER.currentDate = QUEST_TRACKER_currentDate;
		state.QUEST_TRACKER.defaultDate = QUEST_TRACKER_defaultDate;
		state.QUEST_TRACKER.calenderType = QUEST_TRACKER_calenderType;
		state.QUEST_TRACKER.location = QUEST_TRACKER_Location;
		state.QUEST_TRACKER.weatherLocation = QUEST_TRACKER_WeatherLocation;
		state.QUEST_TRACKER.currentWeekdayName = QUEST_TRACKER_currentWeekdayName;
		state.QUEST_TRACKER.currentWeather = QUEST_TRACKER_CURRENT_WEATHER;
		state.QUEST_TRACKER.weatherTrends = QUEST_TRACKER_WEATHER_TRENDS;
		state.QUEST_TRACKER.forcedWeatherTrends = QUEST_TRACKER_FORCED_WEATHER_TRENDS;
		state.QUEST_TRACKER.historicalWeather = QUEST_TRACKER_HISTORICAL_WEATHER;
		state.QUEST_TRACKER.weatherDescription = QUEST_TRACKER_WEATHER_DESCRIPTION;
		state.QUEST_TRACKER.weather = QUEST_TRACKER_WEATHER;
		state.QUEST_TRACKER.imperialMeasurements = QUEST_TRACKER_imperialMeasurements;
		state.QUEST_TRACKER.TreeObjRef = QUEST_TRACKER_TreeObjRef;
		state.QUEST_TRACKER.filter = QUEST_TRACKER_FILTER;
		state.QUEST_TRACKER.rumourFilter = QUEST_TRACKER_RUMOUR_FILTER;
		state.QUEST_TRACKER.filterVisibility = QUEST_TRACKER_FILTER_Visbility;
		state.QUEST_TRACKER.cachedQuestTree = QUEST_TRACKER_CACHED_QUEST_TREE;
		state.QUEST_TRACKER.questStatuses = QUEST_TRACKER_QuestStatuses;
		state.QUEST_TRACKER.campaignFlags = QUEST_TRACKER_Flags;
		state.QUEST_TRACKER.flagStatuses = QUEST_TRACKER_FlagStatuses;
		delete state.QUEST_TRACKER.states;
		delete state.QUEST_TRACKER.stateStatuses;
	};
	const initializeQuestTrackerState = (forced = false) => {
		if (!state.QUEST_TRACKER || Object.keys(state.QUEST_TRACKER).length === 0 || forced) {
			state.QUEST_TRACKER = {
				verboseErrorLogging: true,
				globalQuestData: {},
				globalQuestArray: [],
				globalRumours: {},
				rumoursByLocation: {},
				generations: {},
				readableJSON: true,
				TreeObjRef: {},
				jumpGate: true,
				events: {},
				calendar: {},
				triggers: {},
				versionChecking: {
					TriggerConversion: false,
					RumourConversion: false,
					EventConversion: false,
					EffectConversion: false
				},
				calenderType: 'gregorian',
				currentDate: CALENDARS[QUEST_TRACKER_calenderType]?.defaultDate,
				defaultDate: CALENDARS[QUEST_TRACKER_calenderType]?.defaultDate,
				location: 'northern temperate',
				weatherLocation: 'plains',
				currentWeather: null,
				weatherTrends: {
					dry: 0,
					wet: 0,
					heat: 0,
					cold: 0
				},
				forcedWeatherTrends: {
					dry: false,
					wet: false,
					heat: false,
					cold: false
				},
				historicalWeather: {},
				weather: true,
				imperialMeasurements: {
					temperature: false,
					precipitation: false,
					wind: true,
					visibility: true
				},
				filter: {},
				rumourFilter: {},
				filterVisibility: false,
				cachedQuestTree: false,
				questStatuses: Statuses.normalize(),
				campaignFlags: {},
				flagStatuses: Flags.normalizeStatuses()
			};
			if (!findObjs({ type: 'rollabletable', name: QUEST_TRACKER_ROLLABLETABLE_QUESTS })[0]) {
				const tableQuests = createObj('rollabletable', { name: QUEST_TRACKER_ROLLABLETABLE_QUESTS });
				tableQuests.set('showplayers', false);
			}
			if (!findObjs({ type: 'rollabletable', name: QUEST_TRACKER_ROLLABLETABLE_QUESTGROUPS })[0]) {
				const tableQuestGroups = createObj('rollabletable', { name: QUEST_TRACKER_ROLLABLETABLE_QUESTGROUPS });
				tableQuestGroups.set('showplayers', false);
			}
			let locationTable = findObjs({ type: 'rollabletable', name: QUEST_TRACKER_ROLLABLETABLE_LOCATIONS })[0];
			if (!locationTable) {
				locationTable = createObj('rollabletable', { name: QUEST_TRACKER_ROLLABLETABLE_LOCATIONS });
				locationTable.set('showplayers', false);
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
			if (!findObjs({ type: 'handout', name: QUEST_TRACKER_EventHandoutName })[0]) {
				createObj('handout', { name: QUEST_TRACKER_EventHandoutName });
			}
			if (!findObjs({ type: 'handout', name: QUEST_TRACKER_WeatherHandoutName })[0]) {
				createObj('handout', { name: QUEST_TRACKER_WeatherHandoutName });
			}
			if (!findObjs({ type: 'handout', name: QUEST_TRACKER_CalendarHandoutName })[0]) {
				createObj('handout', { name: QUEST_TRACKER_CalendarHandoutName });
			}
			if (!findObjs({ type: 'handout', name: QUEST_TRACKER_TriggersHandoutName })[0]) {
				createObj('handout', { name: QUEST_TRACKER_TriggersHandoutName });
			}
			Utils.sendGMMessage("QuestTracker has been initialized.");
		}
	};
	const Utils = (() => {
		const H = {
			checkType: (input) => {
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
			}
		};
		const sendGMMessage = (message) => {
			sendChat('Quest Tracker', `/w gm ${message}`, null, { noarchive: true });
		};
		const sendMessage = (message) => {
			sendChat('Quest Tracker', `${message}`);
		};
		const sendDescMessage = (message) => {
			sendChat('', `/desc ${message}`);
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
			if (!content || !`${content}`.trim()) return '{}';
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
				return '{}';
			}
			const jsonContent = content.substring(start, end + 1).trim();
			return jsonContent;
		};
		const updateHandoutField = (dataType = 'quest') => {
			let handoutName;
			switch (dataType.toLowerCase()) {
				case 'rumour':
					handoutName = QUEST_TRACKER_RumourHandoutName;
					break;
				case 'event':
					handoutName = QUEST_TRACKER_EventHandoutName;
					break;
				case 'weather':
					handoutName = QUEST_TRACKER_WeatherHandoutName;
					break;
				case 'quest':
					handoutName = QUEST_TRACKER_QuestHandoutName;
					break;
				case 'calendar':
					handoutName = QUEST_TRACKER_CalendarHandoutName;
					break;
				case 'triggers':
					handoutName = QUEST_TRACKER_TriggersHandoutName;
					break;
				default:
					return;
			}
			const handout = findObjs({ type: 'handout', name: handoutName })[0];
			if (errorCheck(146, 'exists', handout,'handout')) return;
			handout.get('gmnotes', (notes) => {
				const cleanedContent = Utils.stripJSONContent(notes);
				let data;
				try {
					data = JSON.parse(cleanedContent);
					data = normalizeKeys(data);
				} catch (error) {
					errorCheck(5, 'msg', null,`Failed to parse JSON data from GM notes: ${error.message}`);
					return;
				}
				let updatedData;
				switch (dataType.toLowerCase()) {
					case 'rumour':
						updatedData = QUEST_TRACKER_globalRumours;
						break;
					case 'event':
						updatedData = QUEST_TRACKER_Events;
						break;
					case 'weather':
						updatedData = QUEST_TRACKER_HISTORICAL_WEATHER;
						break;
					case 'calendar':
						updatedData = QUEST_TRACKER_Calendar;
						break;
					case 'quest':
						updatedData = QUEST_TRACKER_globalQuestData;
						break;
					case 'triggers':
						updatedData = QUEST_TRACKER_Triggers;
						break;
					default:
						return;
				}
				const updatedContent = QUEST_TRACKER_readableJSON 
					? JSON.stringify(updatedData, null, 2)
						.replace(/\n/g, '<br>')
						.replace(/ {2}/g, '&nbsp;&nbsp;')
					: JSON.stringify(updatedData);
				handout.set('gmnotes', updatedContent, (err) => {
					if (err) {
						errorCheck(6, 'msg', null,`Failed to update GM notes for "${handoutName}": ${err.message}`);
						switch (dataType.toLowerCase()) {
							case 'rumour':
								QUEST_TRACKER_globalRumours = JSON.parse(cleanedContent);
								break;
							case 'event':
								QUEST_TRACKER_Events = JSON.parse(cleanedContent);
								break;
							case 'weather':
								QUEST_TRACKER_HISTORICAL_WEATHER = JSON.parse(cleanedContent);
								break;
							case 'calendar':
								QUEST_TRACKER_Calendar = JSON.parse(cleanedContent);
								break;
							case 'quest':
								QUEST_TRACKER_globalQuestData = JSON.parse(cleanedContent);
								break;
							case 'triggers':
								QUEST_TRACKER_TriggersHandoutName = JSON.parse(cleanedContent);
								break;
							default:
								return;
						}
					}
				});
			});
			saveQuestTrackerData();
			if (dataType === 'rumours') {
				Rumours.calculateRumoursByLocation();
			}
		};
		const togglereadableJSON = (value) => {
			QUEST_TRACKER_readableJSON = (value === 'true');
			saveQuestTrackerData();
			updateHandoutField('quest');
			updateHandoutField('rumour');
			updateHandoutField('event');
			updateHandoutField('weather');
			updateHandoutField('calendar');
			updateHandoutField('triggers');
		};
		const toggleWeather = (value) => {
			QUEST_TRACKER_WEATHER = (value === 'true');
			saveQuestTrackerData();
		};
		const toggleJumpGate = (value) => {
			QUEST_TRACKER_jumpGate = (value === 'true');
			saveQuestTrackerData();
		};
		const toggleVerboseError = (value) => {
			QUEST_TRACKER_verboseErrorLogging = (value === 'true');
			saveQuestTrackerData();
		};
		const toggleImperial = (type, value) => {
			QUEST_TRACKER_imperialMeasurements[type] = (value === 'true');
			saveQuestTrackerData();
		};
		const toggleFilterVisibility = (value) => {
			QUEST_TRACKER_FILTER_Visbility = (value === 'true');
			saveQuestTrackerData();
		};
		const sanitizeString = (input) => {
			if (typeof input !== 'string') {
				Utils.sendGMMessage('Error: Expected a string input.');
				return null;
			}
			const sanitizedString = input.replace(/[^a-zA-Z0-9_ ]/g, '_');
			return sanitizedString;
		};
		const roll20MacroSanitize = (text) => {
			return text
				.replace(/\|/g, '&#124;')
				.replace(/,/g, '&#44;')
				.replace(/{/g, '&#123;')
				.replace(/}/g, '&#125;')
				.replace(/&/g, '&#38;')
				.replace(/ /g, '&#160;')
				.replace(/=/g, '&#61;')
				.replace(/_/g, '&#95;')
				.replace(/\(/g, '&#40;')
				.replace(/\)/g, '&#41;')
				.replace(/\[/g, '&#91;')
				.replace(/\]/g, '&#93;')
				.replace(/</g, '&#60;')
				.replace(/>/g, '&#62;')
				.replace(/`/g, '&#96;')
				.replace(/\*/g, '&#42;')
				.replace(/!/g, '&#33;')
				.replace(/"/g, '&#34;')
				.replace(/#/g, '&#35;')
				.replace(/-/g, '&#45;')
				.replace(/@/g, '&#64;')
				.replace(/%/g, '&#37;');
		};
		const inputAlias = (command) => {
			const aliases = {
				'!qt': '!qt-menu action=main',
				'!qt-date advance': '!qt-date action=modify|unit=day|new=1',
				'!qt-date retreat': '!qt-date action=modify|unit=day|new=-1'
			};
			return aliases[command] || command;
		};
		const getNestedProperty = (obj, path) => {
			const keys = path.split('.');
			return keys.reduce((current, key) => (current && current[key] !== undefined ? current[key] : null), obj);
		}
		return {
			sendGMMessage,
			sendDescMessage,
			sendMessage,
			normalizeKeys,
			stripJSONContent,
			roll20MacroSanitize,
			updateHandoutField,
			togglereadableJSON,
			toggleWeather,
			toggleJumpGate,
			toggleVerboseError,
			toggleImperial,
			toggleFilterVisibility,
			sanitizeString,
			inputAlias,
			getNestedProperty
		};
	})(); 
	const Import = (() => {
		const H = {
			getQuestTableStatusWeights: () => {
				const questTable = findObjs({ type: 'rollabletable', name: QUEST_TRACKER_ROLLABLETABLE_QUESTS })[0];
				if (!questTable) return {};
				return findObjs({ type: 'tableitem', rollabletableid: questTable.id }).reduce((weights, item) => {
					weights[item.get('name')] = item.get('weight') || 1;
					return weights;
				}, {});
			},
			getImportedQuestWeight: (questId, quest, existingStatusWeights = {}) => {
				return Statuses.getIdFromValue(quest.weight)
					|| Statuses.getIdFromValue(quest.status)
					|| existingStatusWeights[questId]
					|| 1;
			},
			importData: (handoutName, dataType, callback = null) => {
				let handout = findObjs({ type: 'handout', name: handoutName })[0];
				if (!handout) {
					handout = createObj('handout', { name: handoutName });
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
						if (dataType === 'Quest') {
							parsedData = Utils.normalizeKeys(parsedData);
							QUEST_TRACKER_globalQuestArray = [];
							const existingStatusWeights = H.getQuestTableStatusWeights();
							Object.keys(parsedData).forEach((questId) => {
								const quest = parsedData[questId];
								quest.relationships = quest.relationships || { logic: 'AND', conditions: [] };
								QUEST_TRACKER_globalQuestArray.push({
									id: questId,
									weight: H.getImportedQuestWeight(questId, quest, existingStatusWeights)
								});
							});
							QUEST_TRACKER_globalQuestData = parsedData;
						} else if (dataType === 'Rumour') {
							parsedData = Utils.normalizeKeys(parsedData);
							Object.keys(parsedData).forEach((questId) => {
								Object.keys(parsedData[questId]).forEach((status) => {
									Object.keys(parsedData[questId][status]).forEach((location) => {
										let rumours = parsedData[questId][status][location];
										if (typeof rumours === 'object' && !Array.isArray(rumours)) {
											parsedData[questId][status][location] = rumours;
										} else {
											parsedData[questId][status][location] = {};
										}
									});
								});
							});
							QUEST_TRACKER_globalRumours = parsedData;
							Rumours.calculateRumoursByLocation();
						} else if (dataType === 'Events') {
							parsedData = Utils.normalizeKeys(parsedData);
							QUEST_TRACKER_Events = parsedData;
						} else if (dataType === 'Weather') {
							parsedData = Utils.normalizeKeys(parsedData);
							QUEST_TRACKER_HISTORICAL_WEATHER = parsedData;
						} else if (dataType === 'Calendar') {
							parsedData = Utils.normalizeKeys(parsedData);
							QUEST_TRACKER_Calendar = parsedData;
						} else if (dataType === 'Triggers') {
							parsedData = Utils.normalizeKeys(parsedData);
							QUEST_TRACKER_Triggers = parsedData;
						}
						saveQuestTrackerData();
						Utils.sendGMMessage(`${dataType} handout "${handoutName}" Imported.`);
					} catch (error) {
						errorCheck(8, 'msg', null,`Error parsing ${dataType} data: ${error.message}`);
					}
					if (typeof callback === 'function') callback();
				});
			},
			syncQuestRollableTable: () => {
				let questTable = findObjs({ type: 'rollabletable', name: QUEST_TRACKER_ROLLABLETABLE_QUESTS })[0];
				if (!questTable) {
					questTable = createObj('rollabletable', { name: QUEST_TRACKER_ROLLABLETABLE_QUESTS });
					questTable.set('showplayers', false);
				}
				const questTableItems = findObjs({ type: 'tableitem', rollabletableid: questTable.id });
				const tableItemMap = {};
				questTableItems.forEach(item => {
					tableItemMap[item.get('name')] = item;
				});
				const questArrayMap = QUEST_TRACKER_globalQuestArray.reduce((map, quest) => {
					map[quest.id] = quest.weight || 1;
					return map;
				}, {});
				const questIdsInGlobalData = Object.keys(QUEST_TRACKER_globalQuestData);
				questIdsInGlobalData.forEach(questId => {
					const weight = questArrayMap[questId] || 1;
					if (!tableItemMap[questId]) {
						createObj('tableitem', {
							rollabletableid: questTable.id,
							name: questId,
							weight
						});
					} else if (`${tableItemMap[questId].get('weight')}` !== `${weight}`) {
						tableItemMap[questId].set('weight', weight);
					}
				});
				questTableItems.forEach(item => {
					const questId = item.get('name');
					if (!QUEST_TRACKER_globalQuestData[questId]) {
						item.remove();
					}
				});
				QUEST_TRACKER_globalQuestArray = questIdsInGlobalData.map(questId => ({
					id: questId,
					weight: questArrayMap[questId] || tableItemMap[questId]?.get('weight') || 1
				}));
				saveQuestTrackerData();
			},
			validateRelationships: (relationships, questId) => {
				const questName = questId.toLowerCase();
				const validateNestedConditions = (conditions) => {
					if (!Array.isArray(conditions)) return true;
					return conditions.every(condition => {
						if (typeof condition === 'string') {
							const lowerCondition = condition.toLowerCase();
							if (errorCheck(9, 'exists', QUEST_TRACKER_globalQuestData.hasOwnProperty(lowerCondition),`QUEST_TRACKER_globalQuestData.hasOwnProperty(${lowerCondition})`)) return false;
							return true;
						} else if (typeof condition === 'object' && condition?.type === 'flag') {
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
					if (errorCheck(10, 'exists', QUEST_TRACKER_globalQuestData.hasOwnProperty(exclusive),`QUEST_TRACKER_globalQuestData.hasOwnProperty(${exclusive})`)) return true;
					else return false;
				});
			},
			cleanUpDataFields: () => {
				Object.keys(QUEST_TRACKER_globalQuestData).forEach(questId => {
					const quest = QUEST_TRACKER_globalQuestData[questId];
					H.validateRelationships(quest.relationships || {}, questId);
				});
				saveQuestTrackerData();
				Utils.updateHandoutField('quest');
			},
			refreshCalendarData: () => {
				Object.keys(CALENDARS).forEach(key => delete CALENDARS[key]);
				if (state.CalenderData?.CALENDARS) Object.assign(CALENDARS, state.CalenderData.CALENDARS);
				if (state.QUEST_TRACKER?.calendar) Object.assign(CALENDARS, state.QUEST_TRACKER.calendar);
			}
		};
		const fullImportProcess = () => {
			const imports = [
				[QUEST_TRACKER_QuestHandoutName, 'Quest'],
				[QUEST_TRACKER_RumourHandoutName, 'Rumour'],
				[QUEST_TRACKER_EventHandoutName, 'Events'],
				[QUEST_TRACKER_WeatherHandoutName, 'Weather'],
				[QUEST_TRACKER_CalendarHandoutName, 'Calendar'],
				[QUEST_TRACKER_TriggersHandoutName, 'Triggers']
			];
			const finalizeImport = () => {
				H.syncQuestRollableTable();
				Quest.cleanUpLooseEnds();
				H.cleanUpDataFields();
				H.refreshCalendarData();
				checkVersion();
				saveQuestTrackerData();
				Utils.sendGMMessage('Import complete.');
			};
			const runNextImport = (index = 0) => {
				if (index >= imports.length) {
					finalizeImport();
					return;
				}
				const [handoutName, dataType] = imports[index];
				H.importData(handoutName, dataType, () => runNextImport(index + 1));
			};
			runNextImport();
		};
		return {
			fullImportProcess
		};
	})(); 
	const Triggers = (() => {
		const H = {
			generateNewTriggerId: () => {
				const allTriggerIds = Object.entries(QUEST_TRACKER_Triggers).flatMap(([category, triggerGroups]) => {
					if (category === "scripts") {
						return Object.keys(triggerGroups);
					}
					return Object.values(triggerGroups).flatMap(triggerGroup => Object.keys(triggerGroup));
				});
				const highestTriggerNumber = allTriggerIds.reduce((max, id) => {
					const match = id.match(/^trigger_(\d+)$/);
					if (match) {
						const number = parseInt(match[1], 10);
						return number > max ? number : max;
					}
					return max;
				}, 0);
				const newTriggerNumber = highestTriggerNumber + 1;
				return `trigger_${newTriggerNumber}`;
			},
			generateNewEffectId: () => {
				const triggers = QUEST_TRACKER_Triggers;
				const getEffectIds = (trigger) => [
					...Object.keys(trigger.effects || {}),
					...Object.keys(trigger.failEffects || {})
				];
				const allIds = Object.entries(triggers).flatMap(([category, triggerGroups]) =>
					category === "scripts"
						? Object.values(triggerGroups).flatMap(trigger => getEffectIds(trigger))
						: Object.values(triggerGroups).flatMap(triggerGroup =>
							Object.values(triggerGroup)
								.flatMap(trigger => getEffectIds(trigger))
						)
				);
				const highestIdNumber = allIds.reduce((max, id) => {
					const match = id.match(/^effect_(\d+)$/);
					if (match) {
						const number = parseInt(match[1], 10);
						return number > max ? number : max;
					}
					return max;
				}, 0);
				const newIdNumber = highestIdNumber + 1;
				return `effect_${newIdNumber}`;
			},
			saveData: () => {
				saveQuestTrackerData();
				Utils.updateHandoutField('triggers');
				QUEST_TRACKER_refreshLinkedQuestHandouts();
			},
			getTargetStructure: (type) => {
				const structures = {
					quest: QUEST_TRACKER_Triggers.quests,
					date: QUEST_TRACKER_Triggers.dates,
					reaction: QUEST_TRACKER_Triggers.reactions,
					rumour: QUEST_TRACKER_Triggers.rumours,
					event: QUEST_TRACKER_Triggers.events,
					script: QUEST_TRACKER_Triggers.scripts,
				};
				return structures[type] || null;
			},
			cleanUpEmptyKeys: () => {
				const targets = [
					'quests.null',
					'dates.null',
					'reactions.null',
					'events.null',
					'rumours.null',
				];
				targets.forEach((path) => {
					const pathParts = path.split('.');
					let current = QUEST_TRACKER_Triggers; 
					for (let i = 0; i < pathParts.length - 1; i++) {
						current = current[pathParts[i]];
					}
					const lastKey = pathParts[pathParts.length - 1];
					if (current[lastKey] && Object.keys(current[lastKey]).length === 0) delete current[lastKey];
				});
			},
			normalizeTrigger: (trigger) => {
				if (!trigger || typeof trigger !== 'object') return;
				if (!Array.isArray(trigger.conditions)) trigger.conditions = [];
				if (!trigger.effects || typeof trigger.effects !== 'object') trigger.effects = {};
				if (!trigger.failEffects || typeof trigger.failEffects !== 'object') trigger.failEffects = {};
			},
			deleteEffectTriggers: (triggerId) => {
				const deleteReferences = (sourceTriggerId, trigger) => {
					['effects', 'failEffects'].forEach(effectSet => {
						if (!trigger?.[effectSet]) return;
						Object.entries(trigger[effectSet]).forEach(([effectId, effect]) => {
							if (effect.effecttype === "trigger" && effect.id === triggerId) {
								manageEffect(sourceTriggerId, effectId, "delete", null, null, effectSet);
							}
						});
					});
				};
				Object.entries(QUEST_TRACKER_Triggers).forEach(([category, parentObjects]) => {
					if (category === "scripts") {
						Object.entries(parentObjects).forEach(([scriptTriggerId, scriptTrigger]) => {
							deleteReferences(scriptTriggerId, scriptTrigger);
						});
						return;
					}
					Object.entries(parentObjects).forEach(([parentId, triggers]) => {
						Object.entries(triggers).forEach(([triggerKey, trigger]) => {
							deleteReferences(triggerKey, trigger);
						});
					});
				});
			},
			buildFlagCondition: (flagKey, statusId) => ({
				type: 'flag',
				key: flagKey,
				status: (() => {
					const resolvedStatus = Flags.getStatusIdFromValue(statusId);
					if (resolvedStatus) return resolvedStatus;
					const parsedStatus = parseInt(statusId, 10);
					return Number.isNaN(parsedStatus) ? 1 : parsedStatus;
				})()
			}),
			conditionEquals: (a, b) => {
				return a?.type === 'flag'
					&& b?.type === 'flag'
					&& a.key === b.key
					&& `${a.status}` === `${b.status}`;
			},
			checkConditions: (trigger) => {
				const conditions = Array.isArray(trigger?.conditions) ? trigger.conditions : [];
				if (conditions.length === 0) return { met: true, unmet: [] };
				const results = conditions.map(condition => {
					if (condition?.type === 'flag') {
						const flag = Flags.getFlag(condition.key);
						const met = !!flag && `${flag.status}` === `${condition.status}`;
						return {
							met,
							label: `${flag?.name || condition.key} is ${flag ? Flags.getStatusName(flag.status) : 'missing'}; needs ${Flags.getStatusName(condition.status)}`
						};
					}
					return { met: true, label: '' };
				});
				return {
					met: results.every(result => result.met),
					unmet: results.filter(result => !result.met).map(result => result.label).filter(label => label !== '')
				};
			},
			runEffects: (trigger, effectSet, currentTriggerId) => {
				const effects = trigger?.[effectSet] || {};
				Object.entries(effects).forEach(([effectId, effect]) => {
					H.applyEffect(effect, currentTriggerId, effectId);
				});
			},
			applyEffect: (effect, currentTriggerId, effectId = null) => {
				const { id, type, value, effecttype = "quest" } = effect || {};
				const targetId = id || currentTriggerId;
				switch (effecttype) {
					case "quest":
						if (!id || !type) return;
						Quest.manageQuestObject({
							action: "update",
							field: type,
							current: id,
							old: null,
							newItem: value,
						});
						break;
					case "event":
						if (!id || !type) return;
						Calendar.manageEventObject({
							action: "update",
							field: type,
							current: id,
							old: null,
							newItem: value,
							date: null
						});
						break;
					case "flag":
						if (!id || !type) return;
						if (!Flags.updateFlag(id, type, value)) {
							errorCheck(283, 'msg', null, `Flag effect ${effectId || ''} could not update flag "${id}" field "${type}".`);
						}
						break;
					case "trigger":
						if (!targetId || !type) return;
						switch(type){
							case 'delete':
								deleteTrigger(targetId);
								break;
							case 'active':
							case 'enabled':
							case 'name':
								Triggers.toggleTrigger(type, targetId, value);
								break;
							case 'date':
							case 'quest':
							case 'reaction':
							case 'rumour':
							case 'event':
							case 'script':
								Triggers.managePrompt(type, targetId, value);
								break;
							case 'actiontype':
								Triggers.manageActionEffect('action', targetId, value);
								break;
							case 'actioneffect':
								Triggers.manageActionEffect('effect', targetId, value);
								break;
							default:
								errorCheck(284, 'msg', null, `Unsupported trigger effect type: ${type}`);
								break;
						}
						break;
				}
			},
			fireTrigger: (triggerId) => {
				const triggerPath = Triggers.locateItem(triggerId, "trigger");
				if (!triggerPath) return;
				const trigger = Utils.getNestedProperty(QUEST_TRACKER_Triggers, triggerPath.replace("QUEST_TRACKER_Triggers.", ""));
				if (!trigger) return;
				const conditionCheck = H.checkConditions(trigger);
				if (!conditionCheck.met) {
					H.runEffects(trigger, 'failEffects', triggerId);
					return;
				}
				if (!trigger.effects || Object.keys(trigger.effects).length === 0) return;
				H.runEffects(trigger, 'effects', triggerId);
				QUEST_TRIGGER_DeleteList.push(triggerId);
			}
		}
		const initializeTriggersStructure = () => {
			if (!QUEST_TRACKER_Triggers.quests) QUEST_TRACKER_Triggers.quests = {};
			if (!QUEST_TRACKER_Triggers.dates) QUEST_TRACKER_Triggers.dates = {};
			if (!QUEST_TRACKER_Triggers.reactions) QUEST_TRACKER_Triggers.reactions = {};
			if (!QUEST_TRACKER_Triggers.rumours) QUEST_TRACKER_Triggers.rumours = {};
			if (!QUEST_TRACKER_Triggers.scripts) QUEST_TRACKER_Triggers.scripts = {};
			if (!QUEST_TRACKER_Triggers.events) QUEST_TRACKER_Triggers.events = {};
			Object.entries(QUEST_TRACKER_Triggers).forEach(([category, triggerGroups]) => {
				if (category === 'scripts') {
					Object.values(triggerGroups).forEach(trigger => H.normalizeTrigger(trigger));
					return;
				}
				Object.values(triggerGroups).forEach(triggerGroup => {
					Object.values(triggerGroup || {}).forEach(trigger => H.normalizeTrigger(trigger));
				});
			});
		};
		const convertAutoAdvanceToTriggers = () => {
			if (QUEST_TRACKER_versionChecking.TriggerConversion) return;
			let triggersConverted = false;
			initializeTriggersStructure();
			for (const [questId, questData] of Object.entries(QUEST_TRACKER_globalQuestData)) {
				if (questData.autoadvance) {
					for (const [status, date] of Object.entries(questData.autoadvance)) {
						const newTriggerId = H.generateNewTriggerId();
						const newEffectId = H.generateNewEffectId();
						if (!QUEST_TRACKER_Triggers.dates[date]) QUEST_TRACKER_Triggers.dates[date] = {};
						QUEST_TRACKER_Triggers.dates[date][newTriggerId] = {
							name: "Converted Trigger",
							enabled: true,
							quest_id: questId,
							change: { type: 'status', value: status },
							conditions: [],
							effects: {
								[newEffectId]: {
									quest_id: questId,
									change: { type: 'status', value: status }
								}
							},
							failEffects: {}
						};
						triggersConverted = true;
					}
					delete questData.autoadvance;
				}
			}
			QUEST_TRACKER_versionChecking.TriggerConversion = true;
			if (triggersConverted) {
				errorCheck(176, 'msg', null, `Autoadvance converted to Triggers (v1.1 update).`);
			}
			H.saveData();
		};
		const convertEffectsToNewFormat = () => {
			if (QUEST_TRACKER_versionChecking.EffectConversion) return;
			let effectsConverted = false;
			initializeTriggersStructure();
			for (const [triggerCategory, triggers] of Object.entries(QUEST_TRACKER_Triggers)) {
				if (triggerCategory === "scripts") {
					for (const [triggerId, trigger] of Object.entries(triggers)) {
						if (trigger.effects) {
							for (const [effectId, effect] of Object.entries(trigger.effects)) {
								if (!effect.effecttype) {
									trigger.effects[effectId] = {
										id: effect.questid || null,
										type: effect.type || null,
										value: effect.value || null,
										effecttype: "quest"
									};
									effectsConverted = true;
								}
							}
						}
					}
				} else {
					for (const [parentId, triggerGroup] of Object.entries(triggers)) {
						for (const [triggerId, trigger] of Object.entries(triggerGroup)) {
							if (trigger.effects) {
								for (const [effectId, effect] of Object.entries(trigger.effects)) {
									if (!effect.effecttype) {
										trigger.effects[effectId] = {
											id: effect.questid || null,
											type: effect.type || null,
											value: effect.value || null,
											effecttype: "quest"
										};
										effectsConverted = true;
									}
								}
							}
						}
					}
				}
			}
			QUEST_TRACKER_versionChecking.EffectConversion = true;
			if (effectsConverted) {
				errorCheck(238, 'msg', null, `Effects converted to new format. (v1.2 update)`);
			}
			H.saveData();
		};
		const addTrigger = () => {
			const newTriggerId = H.generateNewTriggerId();
			initializeTriggersStructure();
			if (!QUEST_TRACKER_Triggers.quests['null']) QUEST_TRACKER_Triggers.quests['null'] = {};
			QUEST_TRACKER_Triggers.quests['null'][newTriggerId] = {
				name: "New Trigger",
				enabled: false,
				action: { type: null, effect: null },
				conditions: [],
				effects: {},
				failEffects: {}
			};
			H.saveData();
		};
		const addQuestTrigger = (questId) => {
			const newTriggerId = H.generateNewTriggerId();
			initializeTriggersStructure();
			if (!QUEST_TRACKER_Triggers.quests[questId]) QUEST_TRACKER_Triggers.quests[questId] = {};
			QUEST_TRACKER_Triggers.quests[questId][newTriggerId] = {
				name: "New Quest Trigger",
				enabled: false,
				action: { type: null, effect: null },
				conditions: [],
				effects: {},
				failEffects: {}
			};
			H.saveData();
			return newTriggerId;
		};
		const addRumourTrigger = (rumourId) => {
			const newTriggerId = H.generateNewTriggerId();
			initializeTriggersStructure();
			if (!QUEST_TRACKER_Triggers.rumours[rumourId]) QUEST_TRACKER_Triggers.rumours[rumourId] = {};
			QUEST_TRACKER_Triggers.rumours[rumourId][newTriggerId] = {
				name: "New Trigger",
				enabled: false,
				conditions: [],
				effects: {},
				failEffects: {}
			};
			H.saveData();
			return newTriggerId;
		};
		const initializeTrigger = (type, input = null) => {
			initializeTriggersStructure();
			let sourceType;
			switch (type) {
				case 'quest': sourceType = 'date'; break;
				case 'date': sourceType = 'quest'; break;
				case 'reaction': sourceType = 'rumour'; break;
				case 'rumour': sourceType = 'event'; break;
				case 'event': sourceType = 'script'; break;
				default: sourceType = 'reaction';
			}
			const sourcePath = locateItem(input, 'trigger');
			const pathParts = sourcePath.split('.');
			const parentPath = pathParts.slice(0, -1).join('.');
			const triggerId = pathParts[pathParts.length - 1];
			const sourceParent = Utils.getNestedProperty(QUEST_TRACKER_Triggers, parentPath.replace('QUEST_TRACKER_Triggers.', ''));
			const sourceTrigger = sourceParent ? sourceParent[triggerId] : null;
			let targetStructure;
			switch (type) {
				case 'quest': targetStructure = QUEST_TRACKER_Triggers.quests; break;
				case 'date': targetStructure = QUEST_TRACKER_Triggers.dates; break;
				case 'reaction': targetStructure = QUEST_TRACKER_Triggers.reactions; break;
				case 'rumour': targetStructure = QUEST_TRACKER_Triggers.rumours; break;
				case 'event': targetStructure = QUEST_TRACKER_Triggers.events; break;
				case 'script': targetStructure = QUEST_TRACKER_Triggers.scripts; break;
			}
			if (type === 'script') {
				targetStructure[triggerId] = {
					...sourceTrigger,
					name: sourceTrigger?.name || 'New Trigger',
					enabled: sourceTrigger?.enabled ?? false,
					effects: sourceTrigger?.effects || {},
					failEffects: sourceTrigger?.failEffects || {},
					conditions: sourceTrigger?.conditions || [],
					active: false
				};
			} else {
				const targetParentKey = 'null';
				const targetParent = targetStructure[targetParentKey] || (targetStructure[targetParentKey] = {});
				targetParent[triggerId] = {
					...sourceTrigger,
					name: sourceTrigger?.name || 'New Trigger',
					enabled: sourceTrigger?.enabled ?? false,
					effects: sourceTrigger?.effects || {},
					failEffects: sourceTrigger?.failEffects || {},
					conditions: sourceTrigger?.conditions || [],
					action: type === 'quest' ? sourceTrigger?.action || { type: null, effect: null } : null
				};
			}
			switch (type) {
				case 'quest':
					break;
				case 'date': 
					if (targetStructure[triggerId]?.action) delete targetStructure[triggerId].action; 
					break;
				case 'reaction': 
					if (targetStructure[triggerId]?.action) delete targetStructure[triggerId].action; 
					if (targetStructure[triggerId]?.dateKey) delete targetStructure[triggerId].dateKey;
					break;
				case 'rumour':
				case 'event':
				case 'script':
					if (targetStructure[triggerId]?.action) delete targetStructure[triggerId].action;
					if (targetStructure[triggerId]?.dateKey) delete targetStructure[triggerId].dateKey;
					if (targetStructure[triggerId]?.questId) delete targetStructure[triggerId].questId;
					break;
				default:
					if (targetStructure[triggerId]?.active) delete targetStructure[triggerId].active;
			}
			if (sourceParent && sourceParent[triggerId]) {
				delete sourceParent[triggerId];
			}
			H.cleanUpEmptyKeys();
			H.saveData();
		};
		const toggleTrigger = (field, triggerId, value) => {
			initializeTriggersStructure();
			const triggerPath = locateItem(triggerId, 'trigger');
			if (errorCheck(203, 'exists', triggerPath, 'triggerPath')) return;
			const trigger = Utils.getNestedProperty(QUEST_TRACKER_Triggers, triggerPath.replace('QUEST_TRACKER_Triggers.', ''));
			if (!trigger) {
				errorCheck(204, 'msg', null, `Trigger not found at path: ${triggerPath}`);
				return;
			}
			const isScript = triggerPath.startsWith("QUEST_TRACKER_Triggers.scripts");
			switch (field) {
				case 'enabled':
					trigger.enabled = value !== "false";
					break;
				case 'active':
					if (!isScript) {
						errorCheck(235, 'msg', null, `'active' can only be toggled for script triggers.`);
						return;
					}
					trigger.active = value !== "false";
					break;
				
				case 'name':
					if (typeof value !== 'string' || value.trim() === '') {
						errorCheck(204, 'msg', null, `Invalid name value: ${value}. Must be a non-empty string.`);
						return;
					}
					trigger.name = value.trim();
					break;
				
				default:
					errorCheck(205, 'msg', null, `Invalid field: ${field}. Use 'enabled', 'name', or 'active'.`);
					return;
			}
			H.saveData();
		};
		const manageTriggerAction = (triggerId, { part, value }) => {
			initializeTriggersStructure();
			const triggerPath = locateItem(triggerId, 'trigger');
			if (errorCheck(192, 'exists', triggerPath, 'triggerPath')) return;
			const trigger = eval(triggerPath);
			switch (part) {
				case 'quest_id': {
					trigger.quest_id = value;
					break;
				}
				case 'rumour_id': {
					if (!triggerPath.startsWith('QUEST_TRACKER_Triggers.rumours')) {
						errorCheck(233, 'msg', null, `Cannot set a rumour ID on a non-rumour trigger.`);
						return;
					}
					trigger.rumour_id = value;
					break;
				}
				case 'triggering_field': {
					trigger.change.type = value;
					break;
				}
				case 'triggering_value': {
					trigger.change.value = value;
					break;
				}
				case 'date': {
					if (!triggerPath.startsWith('QUEST_TRACKER_Triggers.dates')) {
						errorCheck(193, 'msg', null, `Cannot set a date on a non-date trigger.`);
						return;
					}
					trigger.date = value;
					break;
				}
				case 'action': {
					if (!triggerPath.startsWith('QUEST_TRACKER_Triggers.reactions')) {
						errorCheck(195, 'msg', null, `Cannot set an action on a non-reaction trigger.`);
						return;
					}
					trigger.action = value;
					break;
				}
				default: {
					errorCheck(194, 'msg', null, `Invalid part: ${part}.`);
					return;
				}
			}
			H.saveData();
		};
		const manageTriggerEffects = ({ action, value = {}, id = null }) => {
			initializeTriggersStructure();
			const effectPath = locateItem(id, 'effect');
			if (!effectPath && action !== 'add') {
				errorCheck(195, 'msg', null, `Effect with ID ${id} not found.`);
				return;
			}
			let effects, effect;
			if (effectPath) {
				const effectKeyPath = effectPath.split('.effects.')[0];
				effects = eval(effectKeyPath);
				effect = eval(effectPath);
			}
			switch (action) {
				case 'add': {
					if (errorCheck(196, 'exists', effects, 'effects')) return;
					const newEffectId = H.generateNewEffectId();
					effects[newEffectId] = {
						quest_id: null,
						change: { type: null, value: null },
						...value
					};
					break;
				}
				case 'remove': {
					if (errorCheck(197, 'exists', effect, 'effect')) return;
					delete effects[id];
					break;
				}
				case 'edit': {
					if (errorCheck(198, 'exists', effect, 'effect')) return;
					effects[id] = { ...effect, ...value };
					break;
				}
				default:
					errorCheck(199, 'msg', null, `Invalid action: ${action}. Use 'add', 'remove', or 'edit'.`);
					return;
			}
			H.saveData();
		};
		const deleteTrigger = (triggerId) => {
			initializeTriggersStructure();
			const triggerPath = locateItem(triggerId, 'trigger');
			if (!triggerPath) return;
			const pathParts = triggerPath.split('.');
			const category = pathParts[1];
			const parentKey = pathParts[2];
			const triggerKey = pathParts[pathParts.length - 1];
			if (category === "scripts") {
				if (QUEST_TRACKER_Triggers.scripts[triggerKey]) {
					delete QUEST_TRACKER_Triggers.scripts[triggerKey];
					if (Object.keys(QUEST_TRACKER_Triggers.scripts).length === 0) delete QUEST_TRACKER_Triggers.scripts;
				}
			} else {
				let parentObject = QUEST_TRACKER_Triggers[category]?.[parentKey];
				if (!parentObject) return;
				if (parentObject[triggerKey]) delete parentObject[triggerKey];
				if (Object.keys(parentObject).length === 0) delete QUEST_TRACKER_Triggers[category][parentKey];
				if (Object.keys(QUEST_TRACKER_Triggers[category]).length === 0) delete QUEST_TRACKER_Triggers[category];
			}
			H.deleteEffectTriggers(triggerId);
			Object.entries(QUEST_TRACKER_Triggers.reactions).forEach(([reactionParent, reactionTriggers]) => {
				Object.entries(reactionTriggers).forEach(([reactionTriggerId, reactionTrigger]) => {
					if (reactionTrigger.action === triggerId) deleteTrigger(reactionTriggerId);
				});
			});
			H.saveData();
		};
		const locateItem = (itemId, field) => {
			for (const [type, category] of Object.entries(QUEST_TRACKER_Triggers)) {
				if (type === "scripts") {
					if (field === "trigger" && category[itemId]) return `QUEST_TRACKER_Triggers.scripts.${itemId}`;
					if (field === "effect") {
						for (const [triggerId, trigger] of Object.entries(category)) {
							if (trigger.effects && trigger.effects[itemId]) return `QUEST_TRACKER_Triggers.scripts.${triggerId}.effects.${itemId}`;
							if (trigger.failEffects && trigger.failEffects[itemId]) return `QUEST_TRACKER_Triggers.scripts.${triggerId}.failEffects.${itemId}`;
						}
					}
					continue;
				}
				if (type === "dates" && field === "trigger") {
					for (const [dateKey, dateTriggers] of Object.entries(category)) {
						if (dateTriggers[itemId]) return `QUEST_TRACKER_Triggers.dates.${dateKey}.${itemId}`;
					}
				}
				for (const [parentId, items] of Object.entries(category)) {
					if (field === 'trigger' && items[itemId]) {
						return `QUEST_TRACKER_Triggers.${type}.${parentId}.${itemId}`;
					}
					if (field === 'effect') {
						for (const [triggerId, trigger] of Object.entries(items)) {
							if (trigger.effects && trigger.effects[itemId]) return `QUEST_TRACKER_Triggers.${type}.${parentId}.${triggerId}.effects.${itemId}`;
							if (trigger.failEffects && trigger.failEffects[itemId]) return `QUEST_TRACKER_Triggers.${type}.${parentId}.${triggerId}.failEffects.${itemId}`;
						}
					}
				}
			}
			return null;
		};
		const managePrompt = (field, triggerId, value) => {
			initializeTriggersStructure();
			const sourcePath = locateItem(triggerId, 'trigger');
			if (!sourcePath) {
				errorCheck(306, 'msg', null, `Trigger ${triggerId} not found.`);
				return;
			}
			const pathParts = sourcePath.split('.');
			const parentPath = pathParts.slice(0, -1).join('.');
			const sourceParent = Utils.getNestedProperty(
				QUEST_TRACKER_Triggers,
				parentPath.replace('QUEST_TRACKER_Triggers.', '')
			);
			const sourceTrigger = sourceParent ? sourceParent[triggerId] : null;
			if (!sourceParent || !sourceTrigger) {
				errorCheck(307, 'msg', null, `Trigger ${triggerId} could not be moved.`);
				return;
			}
			let targetStructure;
			switch (field) {
				case 'quest': targetStructure = QUEST_TRACKER_Triggers.quests; break;
				case 'date': targetStructure = QUEST_TRACKER_Triggers.dates; break;
				case 'reaction': targetStructure = QUEST_TRACKER_Triggers.reactions; break;
				case 'rumour': targetStructure = QUEST_TRACKER_Triggers.rumours; break;
				case 'event': targetStructure = QUEST_TRACKER_Triggers.events; break;
				case 'script': targetStructure = QUEST_TRACKER_Triggers.scripts; break;
				default: return;
			}
			if (field === 'script') {
				if (pathParts[1] === 'scripts') {
					sourceTrigger.active = sourceTrigger.active || false;
					H.saveData();
					return;
				}
				targetStructure[triggerId] = {
					...sourceTrigger,
					active: sourceTrigger.active || false
				};
				delete sourceParent[triggerId];
				if (Object.keys(sourceParent).length === 0 && pathParts[1] !== 'scripts') {
					const sourceStructure = QUEST_TRACKER_Triggers[pathParts[1]];
					if (sourceStructure) delete sourceStructure[pathParts[2]];
				}
				H.cleanUpEmptyKeys();
				H.saveData();
				return;
			}
			let targetParentKey = value || 'null';
			const targetParent = targetStructure[targetParentKey] || (targetStructure[targetParentKey] = {});
			const sameParent = sourceParent === targetParent;
			targetParent[triggerId] = {
				...sourceTrigger,
				...(field === 'quest' ? { action: sourceTrigger?.action || { type: null, effect: null } } : {}),
				...(field === 'date' ? { dateKey: value || 'null' } : {})
			};
			if (!sameParent) delete sourceParent[triggerId];
			if (!sameParent && Object.keys(sourceParent).length === 0) {
				let sourceStructure;
				switch (pathParts[1]) {
					case 'quests': sourceStructure = QUEST_TRACKER_Triggers.quests; break;
					case 'dates': sourceStructure = QUEST_TRACKER_Triggers.dates; break;
					case 'reactions': sourceStructure = QUEST_TRACKER_Triggers.reactions; break;
					case 'rumours': sourceStructure = QUEST_TRACKER_Triggers.rumours; break;
					case 'events': sourceStructure = QUEST_TRACKER_Triggers.events; break;
					case 'scripts': sourceStructure = QUEST_TRACKER_Triggers.scripts; break;
					default: return;
				}
				delete sourceStructure[pathParts[2]];
			}
			H.saveData();
		};
		const manageActionEffect = (field, triggerId, type) => {
			Triggers.initializeTriggersStructure();
			const triggerPath = Triggers.locateItem(triggerId, "trigger");
			if (!triggerPath || !triggerPath.startsWith("QUEST_TRACKER_Triggers.quests")) return;
			const trigger = Utils.getNestedProperty(QUEST_TRACKER_Triggers, triggerPath.replace("QUEST_TRACKER_Triggers.", ""));
			if (!trigger || !trigger.action) return;
			switch(field) {
				case 'action':
					trigger.action.type = type;
					trigger.action.effect = null;
					break;
				case 'effect':
					trigger.action.effect = type;
					break;
			}
			H.saveData();
		};
		const manageEffect = (triggerId, effectId, action, key = null, value = null, effectSet = 'effects') => {
			Triggers.initializeTriggersStructure();
			const triggerPath = Triggers.locateItem(triggerId, "trigger");
			if (!triggerPath || !triggerPath.startsWith("QUEST_TRACKER_Triggers")) {
				errorCheck(230, "msg", null, `Trigger ID ${triggerId} not found.`);
				return;
			}
			const trigger = Utils.getNestedProperty(QUEST_TRACKER_Triggers, triggerPath.replace("QUEST_TRACKER_Triggers.", ""));
			if (!['effects', 'failEffects'].includes(effectSet)) effectSet = 'effects';
			if (!trigger) return;
			if (!trigger[effectSet]) trigger[effectSet] = {};
			const effects = trigger[effectSet];
			const newEffectId = action === "add" ? H.generateNewEffectId() : null;
			switch (action) {
				case "add":
					effects[newEffectId] = {
						id: null,
						type: null,
						value: null,
						effecttype: 'quest'
					};
					break;
				case "delete":
					delete effects[effectId];
					break;
				case "modify":
					if (!effects[effectId]) return;
					if (key === 'effecttype') {
						effects[effectId] = {
							id: null,
							type: null,
							value: null,
							effecttype: value
						};
					} else if (key === 'type') {
						effects[effectId].type = value;
						effects[effectId].value = null;
					} else {
						effects[effectId][key] = value;
					}
					break;
			}
			H.saveData();
		};
		const manageCondition = (triggerId, action, condition, oldCondition = null) => {
			initializeTriggersStructure();
			const triggerPath = locateItem(triggerId, 'trigger');
			if (errorCheck(285, 'exists', triggerPath, 'triggerPath')) return;
			const trigger = Utils.getNestedProperty(QUEST_TRACKER_Triggers, triggerPath.replace('QUEST_TRACKER_Triggers.', ''));
			if (!trigger) return;
			if (!Array.isArray(trigger.conditions)) trigger.conditions = [];
			switch (action) {
				case 'add':
					if (!trigger.conditions.some(existingCondition => H.conditionEquals(existingCondition, condition))) {
						trigger.conditions.push(condition);
					}
					break;
				case 'remove':
					trigger.conditions = trigger.conditions.filter(existingCondition => !H.conditionEquals(existingCondition, condition));
					break;
				case 'update':
					trigger.conditions = trigger.conditions.filter(existingCondition => !H.conditionEquals(existingCondition, oldCondition));
					if (!trigger.conditions.some(existingCondition => H.conditionEquals(existingCondition, condition))) {
						trigger.conditions.push(condition);
					}
					break;
				default:
					errorCheck(286, 'msg', null, `Unknown trigger condition action: ${action}`);
					return;
			}
			H.saveData();
		};
		const checkTriggers = (type, id = null) => {
			switch (type) {
				case "date": {
					const currentDate = new Date(QUEST_TRACKER_currentDate);
					Object.entries(QUEST_TRACKER_Triggers.dates).forEach(([dateKey, triggers]) => {
						const triggerDate = new Date(dateKey);
						if (triggerDate <= currentDate) {
							Object.entries(triggers).forEach(([triggerId, trigger]) => {
								if (trigger.enabled) H.fireTrigger(triggerId);
							});
						}
					});
					break;
				}
				case "quest": {
					const questTriggers = QUEST_TRACKER_Triggers.quests[id] || {};
					Object.entries(questTriggers).forEach(([triggerId, trigger]) => {
						if (!trigger.enabled || !trigger.action) return;
						const { type, effect } = trigger.action;
						switch (type) {
							case "hidden":
								const isHidden = QUEST_TRACKER_globalQuestData[id]?.hidden;
								if (String(isHidden) === effect) H.fireTrigger(triggerId);
								break;
							case "disabled":
								const isDisabled = QUEST_TRACKER_globalQuestData[id]?.disabled;
								if (String(isDisabled) === effect) H.fireTrigger(triggerId);
								break;
							case "status":
								const currentStatus = Quest.getQuestStatus(id);
								if (`${effect}` === `${currentStatus}`) H.fireTrigger(triggerId);
								break;
						}
					});
					break;
				}
				case "reaction": {
					Object.entries(QUEST_TRACKER_Triggers.reactions).forEach(([reactionTriggerId, reactions]) => {
						if (id && reactionTriggerId !== id) return;
						Object.entries(reactions).forEach(([triggerId, trigger]) => {
							if (trigger.enabled) H.fireTrigger(triggerId);
						});
					});
					break;
				}
				case "rumour": {
					Object.entries(QUEST_TRACKER_Triggers.rumours).forEach(([rumourTriggerId, rumours]) => {
						if (id && rumourTriggerId !== id) return;
						Object.entries(rumours).forEach(([triggerId, trigger]) => {
							if (trigger.enabled) H.fireTrigger(triggerId);
						});
					});
					break;
				}
				case "event": {
					Object.entries(QUEST_TRACKER_Triggers.events).forEach(([eventTriggerId, events]) => {
						if (id && eventTriggerId !== id) return;
						Object.entries(events).forEach(([triggerId, trigger]) => {
							if (trigger.enabled) H.fireTrigger(triggerId);
						});
					});
					break;
				}
				case "script": {
					Object.entries(QUEST_TRACKER_Triggers.scripts).forEach(([triggerId, trigger]) => {
						if (trigger.enabled && (!id || triggerId === id)) H.fireTrigger(triggerId);
					});
					break;
				}
			}
			if (QUEST_TRIGGER_DeleteList.length > 0) {
				QUEST_TRIGGER_DeleteList = QUEST_TRIGGER_DeleteList.filter(triggerId => {
					const shouldDelete = type === 'script' && id ? triggerId === id : true;
					if (shouldDelete) {
						deleteTrigger(triggerId);
						return false;
					}
					return true; 
				});
			}
		};
		const removeQuestsFromTriggers = (questId) => {
			Triggers.initializeTriggersStructure();
			if (QUEST_TRACKER_Triggers.quests[questId]) {
				Object.keys(QUEST_TRACKER_Triggers.quests[questId]).forEach((triggerId) => {
					Triggers.deleteTrigger(triggerId);
				});
				delete QUEST_TRACKER_Triggers.quests[questId];
			}
			H.saveData();
		};
		return {
			initializeTriggersStructure,
			convertAutoAdvanceToTriggers,
			convertEffectsToNewFormat,
			addTrigger,
			addQuestTrigger,
			addRumourTrigger,
			initializeTrigger,
			toggleTrigger,
			manageTriggerAction,
			manageTriggerEffects,
			deleteTrigger,
			locateItem,
			managePrompt,
			manageActionEffect,
			manageEffect,
			manageCondition,
			checkTriggers,
			removeQuestsFromTriggers
		};
	})();
	const Quest = (() => {
		const H = {
			isFlagCondition: (condition) => {
				return typeof condition === 'object' && condition !== null && condition.type === 'flag' && condition.key;
			},
			isQuestCondition: (condition) => typeof condition === 'string',
			buildFlagCondition: (flagKey, statusId) => ({
				type: 'flag',
				key: flagKey,
				status: (() => {
					const resolvedStatus = Flags.getStatusIdFromValue(statusId);
					if (resolvedStatus) return resolvedStatus;
					const parsedStatus = parseInt(statusId, 10);
					return Number.isNaN(parsedStatus) ? 1 : parsedStatus;
				})()
			}),
			conditionEquals: (a, b) => {
				if (typeof a === 'string' || typeof b === 'string') return a === b;
				if (H.isFlagCondition(a) && H.isFlagCondition(b)) {
					return a.key === b.key && `${a.status}` === `${b.status}`;
				}
				return false;
			},
			addCondition: (conditions, newCondition) => {
				if (!conditions.some(condition => H.conditionEquals(condition, newCondition))) {
					conditions.push(newCondition);
				}
			},
			removeCondition: (conditions, oldCondition) => {
				return conditions.filter(condition => !H.conditionEquals(condition, oldCondition));
			},
			getFlagRequirementLabel: (condition) => {
				const flag = Flags.getFlag(condition.key);
				const flagName = flag?.name || condition.key;
				const requiredStatus = Flags.getStatusName(condition.status);
				const currentStatus = flag ? Flags.getStatusName(flag.status) : 'Missing Flag';
				return `${flagName} = ${requiredStatus} <small>(current: ${currentStatus})</small>`;
			},
			buildFlagDropdownString: () => {
				const flags = Object.entries(QUEST_TRACKER_Flags)
					.map(([key, flag]) => ({
						key,
						name: Utils.roll20MacroSanitize(flag.name || key)
					}))
					.sort((a, b) => a.name.localeCompare(b.name));
				if (flags.length === 0) return '';
				if (flags.length === 1) return flags[0].key;
				return `?{Choose Flag|${flags.map(flag => `${flag.name},${flag.key}`).join('|')}}`;
			},
			buildFlagRequirementLink: (questId, groupnum = null) => {
				const flagDropdown = H.buildFlagDropdownString();
				if (!flagDropdown) {
					return `<span style="${styles.buttonDisabled} ${styles.smallButton}">+</span>`;
				}
				const groupPart = groupnum === null ? '' : `|groupnum=${groupnum}`;
				return `<a href="!qt-questrelationship currentquest=${questId}|action=add|type=flag${groupPart}|flag=${flagDropdown}|status=?{Flag Status${Flags.buildStatusDropdown()}}" style="${styles.button} ${styles.smallButton}">+</a>`;
			},
			checkPrerequisites: (questId) => {
				const quest = QUEST_TRACKER_globalQuestData[questId];
				const relationships = quest?.relationships || {};
				const conditions = relationships.conditions || [];
				const evaluateCondition = (condition) => {
					if (typeof condition === 'string') {
						const status = Quest.getQuestStatus(condition);
						const met = Statuses.isComplete(status);
						return {
							met,
							label: `${QUEST_TRACKER_globalQuestData[condition]?.name || condition} is ${Statuses.getName(status)}`
						};
					}
					if (H.isFlagCondition(condition)) {
						const flag = Flags.getFlag(condition.key);
						const met = !!flag && `${flag.status}` === `${condition.status}`;
						return {
							met,
							label: `${flag?.name || condition.key} is ${flag ? Flags.getStatusName(flag.status) : 'missing'}; needs ${Flags.getStatusName(condition.status)}`
						};
					}
					if (typeof condition === 'object' && condition.logic && Array.isArray(condition.conditions)) {
						const groupResult = evaluateConditions(condition.conditions, condition.logic);
						return {
							met: groupResult.met,
							label: groupResult.unmet.join('; '),
							unmet: groupResult.unmet
						};
					}
					return { met: true, label: '' };
				};
				const evaluateConditions = (items, logic = 'AND') => {
					const results = items.map(evaluateCondition).filter(result => result.label !== '');
					const met = logic === 'OR' ? results.some(result => result.met) : results.every(result => result.met);
					return {
						met,
						unmet: results
							.filter(result => !result.met)
							.flatMap(result => Array.isArray(result.unmet) ? result.unmet : [result.label])
							.filter(label => label !== '')
					};
				};
				return evaluateConditions(conditions, relationships.logic || 'AND');
			},
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
				const questTable = findObjs({ type: 'rollabletable', name: QUEST_TRACKER_ROLLABLETABLE_QUESTS })[0];
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
				const questTable = findObjs({ type: 'rollabletable', name: QUEST_TRACKER_ROLLABLETABLE_QUESTS })[0];
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
				if (questData.group) {
					Object.keys(QUEST_TRACKER_globalQuestData).forEach(key => {
						const otherQuest = QUEST_TRACKER_globalQuestData[key];
						if (otherQuest.group && otherQuest.group !== questData.group) {
							exclusions.add(key);
						}
					});
				}
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
									H.addCondition(currentRelationships.conditions, newItem);
								} else {
									if (!currentRelationships.conditions.some(condition => H.conditionEquals(condition, newItem))) {
										currentRelationships.conditions.splice(baseIndex, 0, newItem);
									}
								}
								break;
							case 'remove':
								currentRelationships.conditions = H.removeCondition(currentRelationships.conditions, newItem);
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
									H.addCondition(group.conditions, newItem);
									break;
								case 'remove':
									group.conditions = H.removeCondition(group.conditions, newItem);
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
			},
			getAllQuestGroups: () => {
				let groupTable = findObjs({ type: 'rollabletable', name: QUEST_TRACKER_ROLLABLETABLE_QUESTGROUPS })[0];
				if (!groupTable) return [];
				let groupItems = findObjs({ type: 'tableitem', rollabletableid: groupTable.id });
				return groupItems.map(item => item.get('name'));
			},
			removeQuestsFromGroup: (groupTable, groupId) => {
				const groupObject = findObjs({ type: 'tableitem', rollabletableid: groupTable.id }).find(item => item.get('weight') == groupId);
				if (!groupObject) return;
	
				Object.keys(QUEST_TRACKER_globalQuestData).forEach(questId => {
					const quest = QUEST_TRACKER_globalQuestData[questId] || {};
					if (quest.group === groupId) {
						delete quest.group;
					}
				});
				Utils.updateHandoutField('quest');
			},
			getNewGroupId: (groupTable) => {
				let groupItems = findObjs({ type: 'tableitem', rollabletableid: groupTable.id });
				if (!groupItems || groupItems.length === 0) return 1;
				let maxWeight = groupItems.reduce((max, item) => Math.max(max, item.get('weight')), 0);
				return maxWeight + 1;
			},
			levenshteinDistance: (a, b) => {
				if (!a.length) return b.length;
				if (!b.length) return a.length;
				const matrix = Array.from({ length: a.length + 1 }, (_, i) => Array(b.length + 1).fill(0));
				for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
				for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
				for (let i = 1; i <= a.length; i++) {
					for (let j = 1; j <= b.length; j++) {
						matrix[i][j] =
							a[i - 1] === b[j - 1]
								? matrix[i - 1][j - 1]
								: Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + 1);
					}
				}
				return matrix[a.length][b.length];
			},
			getBestMatchingHandout: (questName) => {
				const handouts = findObjs({ type: 'handout' });
				if (!handouts || handouts.length === 0) return null;
				let bestMatch = null;
				let bestDistance = Infinity;
				handouts.forEach(handout => {
					const handoutName = handout.get('name');
					const distance = H.levenshteinDistance(questName.toLowerCase(), handoutName.toLowerCase());
					if (distance < bestDistance) {
						bestDistance = distance;
						bestMatch = handout;
					}
				});
				if (bestMatch) return bestMatch.id;
				else return null;
			}
		};
		const manageRelationship = (questId, action, relationshipType, newItem = null, groupnum = null) => {
			let questData = QUEST_TRACKER_globalQuestData[questId];
			let currentRelationships = questData.relationships || { logic: 'AND', conditions: [], mutually_exclusive: [] };
			currentRelationships.conditions = currentRelationships.conditions || [];
			currentRelationships.mutually_exclusive = currentRelationships.mutually_exclusive || [];
			if (action === 'add' && newItem) {
				let targetQuest = QUEST_TRACKER_globalQuestData[newItem];
				if (targetQuest && questData.group && !targetQuest.group) {
					targetQuest.group = questData.group;
				} else if (targetQuest && !questData.group && targetQuest.group) {
					questData.group = targetQuest.group;
				}
			}
			let updatedRelationships = H.modifyRelationshipObject(currentRelationships, action, relationshipType, newItem, groupnum);
			questData.relationships = updatedRelationships;
			Utils.updateHandoutField('quest')
			QUEST_TRACKER_refreshLinkedQuestHandouts(questId);
		};
		const getValidQuestsForDropdown = (questId) => {
			const exclusions = H.getExclusions(questId);
			const excludedQuests = new Set([questId, ...exclusions]);
			const validQuests = Object.keys(QUEST_TRACKER_globalQuestData).filter(qId => {
				return !excludedQuests.has(qId);
			});
			if (validQuests.length === 0) {
				return false;
			}
			return validQuests;
		};
		const addQuest = () => {
			const newQuestId = H.generateNewQuestId();
			const defaultQuestData = {
				name: 'New Quest',
				description: 'Description',
				relationships: {},
				hidden: true,
				disabled: false
			};
			const questTable = findObjs({ type: 'rollabletable', name: QUEST_TRACKER_ROLLABLETABLE_QUESTS })[0];
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
			H.removeQuestReferences(questId);
			H.removeQuestFromRollableTable(questId);
			Rumours.removeAllRumoursForQuest(questId);
			Triggers.removeQuestsFromTriggers(questId);
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
		const getStatusNameByQuestId = (questId, questArray) => {
			let quest = questArray.find(q => q.id === questId);
			if (quest) {
				return Statuses.getName(quest.weight);
			}
			return 'Unknown';
		};
		const getQuestStatus = (questId) => {
			const questTable = findObjs({ type: 'rollabletable', name: QUEST_TRACKER_ROLLABLETABLE_QUESTS })[0];
			if (!questTable) {
				return 1;
			}
			const questItem = findObjs({ type: 'tableitem', rollabletableid: questTable.id }).find(item => item.get('name') === questId);
			if (!questItem) {
				return 1;
			}
			return questItem.get('weight');
		};
		const buildFlagCondition = (flagKey, statusId) => H.buildFlagCondition(flagKey, statusId);
		const manageQuestObject = ({ action, field, current, old = '', newItem }) => {
			const quest = QUEST_TRACKER_globalQuestData[current];
			switch (field) {
				case 'status':
					if (action === 'update' && Statuses.requiresPrerequisites(newItem)) {
						const prerequisiteCheck = H.checkPrerequisites(current);
						if (!prerequisiteCheck.met) {
							Utils.sendGMMessage(`Cannot progress "${quest.name || current}". Unmet prerequisites: ${prerequisiteCheck.unmet.join('; ')}`);
							return;
						}
					}
					H.updateQuestStatus(current, newItem);
					QuestPageBuilder.updateQuestStatusColor(current, newItem);
					Rumours.calculateRumoursByLocation();
					break;
				case 'hidden':
					if (action === 'update') {
						quest.hidden = !quest.hidden;
						QuestPageBuilder.updateQuestVisibility(current, quest.hidden);
					}
					break;
				case 'disabled':
					if (action === 'update') {
						quest.disabled = !quest.disabled;
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
				case 'group':
					if (action === 'add') {
						quest.group = newItem;
					} else if (action === 'remove') {
						delete quest.group;
					}
					break;
				default:
					errorCheck(11, 'msg', null,`Unsupported action for type ( ${field} )`);
					break;
			}
			Triggers.checkTriggers('quest',current);
			Utils.updateHandoutField('quest');
			QUEST_TRACKER_refreshLinkedQuestHandouts(current);
		};
		const manageGroups = (action, newItem = null, groupId = null) => {
			let groupTable = findObjs({ type: 'rollabletable', name: QUEST_TRACKER_ROLLABLETABLE_QUESTGROUPS })[0];
			if (!groupTable) {
				errorCheck(12, 'msg', null,`Quest groups table not found.`)
				return;
			}
			switch (action) {
				case 'add':
					const allGroups = findObjs({ type: 'tableitem', rollabletableid: groupTable.id }).map(item => item.get('name').toLowerCase());
					if (allGroups.includes(Utils.sanitizeString(newItem.toLowerCase()))) return;
					const newWeight = H.getNewGroupId(groupTable);
					if (newWeight === undefined || newWeight === null) return;
					let newGroup = createObj('tableitem', {
						rollabletableid: groupTable.id,
						name: newItem,
						weight: newWeight
					});
					break;
				case 'remove':
					if (groupId === 1) return;
					let groupToRemove = findObjs({ type: 'tableitem', rollabletableid: groupTable.id }).find(item => item.get('weight') == groupId);
					H.removeQuestsFromGroup(groupTable, groupId);
					groupToRemove.remove();
					break;
				case 'update':
					const groupList = findObjs({ type: 'tableitem', rollabletableid: groupTable.id }).map(item => item.get('name').toLowerCase());
					if (groupList.includes(Utils.sanitizeString(newItem.toLowerCase()))) return;
					let groupToUpdate = findObjs({ type: 'tableitem', rollabletableid: groupTable.id }).find(item => item.get('weight') == groupId);
					if (groupToUpdate) {
						groupToUpdate.set('name', newItem);
					}
					break;
			}
		};
		const findDirectlyLinkedQuests = (startingQuestId) => {
			const linkedQuests = [];
			const visited = new Set();
			function isDependentOnQuest(conditions, targetQuestId) {
				if (!conditions) return false;
				if (Array.isArray(conditions)) {
					return conditions.every(cond => {
						if (typeof cond === "string") {
							return cond === targetQuestId;
						} else if (typeof cond === "object" && cond.logic === "AND") {
							return isDependentOnQuest(cond.conditions, targetQuestId);
						} else if (typeof cond === "object" && cond.logic === "OR") {
							return false;
						}
						return false;
					});
				} else if (typeof conditions === "string") {
					return conditions === targetQuestId;
				} else if (typeof conditions === "object" && conditions.logic === "AND") {
					return isDependentOnQuest(conditions.conditions, targetQuestId);
				}
				return false;
			}
			function traverse(questId) {
				if (visited.has(questId)) return;
				visited.add(questId);
				Object.entries(QUEST_TRACKER_globalQuestData).forEach(([currentQuestId, quest]) => {
					if (currentQuestId === questId || visited.has(currentQuestId)) return;

					const relationships = quest.relationships;
					if (relationships?.logic === "AND") {
						const conditions = relationships.conditions;
						if (isDependentOnQuest(conditions, questId)) {
							linkedQuests.push(currentQuestId);
							traverse(currentQuestId);
						}
					}
				});
			}
			traverse(startingQuestId);
			return linkedQuests;
		};
		const linkHandout = (questId, key) => {
			const quest = QUEST_TRACKER_globalQuestData[questId];
			if (key === "AUTO") {
				const handoutId = H.getBestMatchingHandout(quest.name);
				if (handoutId) linkHandout(questId, handoutId);
				else {
					const newHandout = createObj('handout', { name: quest.name });
					if (newHandout) linkHandout(questId, newHandout.id);
				}
			}
			else quest.handout = key;
			Utils.updateHandoutField('quest');
			QUEST_TRACKER_refreshLinkedQuestHandouts(questId);
		};
		const removeHandout = (questId) => {
			const quest = QUEST_TRACKER_globalQuestData[questId];
			if (quest && quest.handout) {
				delete quest.handout;
			}
			Utils.updateHandoutField('quest');
			QUEST_TRACKER_refreshLinkedQuestHandouts(questId);
		};
		return {
			getStatusNameByQuestId,
			getQuestStatus,
			getValidQuestsForDropdown,
			manageRelationship,
			buildFlagCondition,
			addQuest,
			removeQuest,
			cleanUpLooseEnds,
			manageQuestObject,
			manageGroups,
			findDirectlyLinkedQuests,
			linkHandout,
			removeHandout
		};
	})(); 
	const Calendar = (() => {
		const H = {
			generateNewEventId: () => {
				const existingEventIds = Object.keys(QUEST_TRACKER_Events);
				const highestEventNumber = existingEventIds.reduce((max, id) => {
					const match = id.match(/^event_(\d+)$/);
					return match ? Math.max(max, parseInt(match[1], 10)) : max;
				}, 0);
				return `event_${highestEventNumber + 1}`;
			},
			checkEvent: () => {
				if (!QUEST_TRACKER_Events || typeof QUEST_TRACKER_Events !== "object") return;
				const todayEvents = H.findNextEvents(0, true);
				todayEvents.forEach(([eventDate, eventName, eventID]) => {
					if (eventID) {
						const event = QUEST_TRACKER_Events[eventID];
						if (errorCheck(13, 'exists', event, 'event') || !event.enabled) return;
						if (event.hidden === false) {
							Utils.sendMessage(`${event.name} - ${event.description}`);
						} else {
							Utils.sendGMMessage(`Event triggered: ${event.name} - ${event.description}`);
						}
						if (!event.repeatable) {
							delete QUEST_TRACKER_Events[eventID];
							Utils.updateHandoutField("event");
						} else {
							const frequencyDays = event.frequency || 1;
							const [year, month, day] = event.date.split("-").map(Number);
							const nextDate = new Date(year, month - 1, day + frequencyDays)
								.toISOString().split("T")[0];
							event.date = nextDate;
							Utils.updateHandoutField("event");
						}
					} else {
						Utils.sendMessage(`Today is ${eventName}`);
					}
				});
			},
			evaluateLogic: (logic, year) => {
				if (errorCheck(15, 'exists', logic,'logic')) return false;
				if (errorCheck(16, 'exists', logic.operation,'logic.operation')) return false;
				if (logic.conditions) {
					if (logic.operation === "or") {
						return logic.conditions.some((condition) => H.evaluateLogic(condition, year));
					} else if (logic.operation === "and") {
						return logic.conditions.every((condition) => H.evaluateLogic(condition, year));
					}
					errorCheck(17, 'msg', null,`Unsupported logic operation: ${logic.operation}`);
					return false;
				}
				if (logic.operation === "mod") {
					const result = (year % logic.operand) === logic.equals;
					return logic.negate ? !result : result;
				}
				errorCheck(18, 'msg', null,`Unsupported condition operation: ${logic.operation}`);
				return false;
			},
			getDaysInMonth: (monthIndex, year) => {
				const month = CALENDARS[QUEST_TRACKER_calenderType].months[monthIndex - 1];
				if (month.leap) {
					const isLeapYear = H.evaluateLogic(month.leap.logic, year);
					if (isLeapYear) {
						return month.leap.days;
					}
				}
				return month.days;
			},
			getTotalDaysInYear: (year) => {
				const calendar = CALENDARS[QUEST_TRACKER_calenderType];
				if (errorCheck(19, 'exists', calendar,'calendar')) return;
				if (errorCheck(20, 'exists', calendar.months,'calendar.monthsn')) return;
				return calendar.months.reduce((totalDays, monthObj, index) => {
					const daysInMonth = H.getDaysInMonth(index + 1, year);
					return totalDays + daysInMonth;
				}, 0);
			},
			calculateDateDifference: (target, baseYear, baseMonth, baseDay) => {
				if (!target) return Infinity;
				const calendar = CALENDARS[QUEST_TRACKER_calenderType];
				if (errorCheck(21, 'exists', calendar,'calendar')) return Infinity;
				const { year: targetYear, month: targetMonth, day: targetDay } = target;
				let totalDays = 0;
				if (targetYear === baseYear) {
					if (targetMonth === baseMonth) {
						return targetDay - baseDay;
					}
					totalDays += H.getDaysInMonth(baseMonth, baseYear) - baseDay;
					for (let m = baseMonth + 1; m < targetMonth; m++) {
						totalDays += H.getDaysInMonth(m, baseYear);
					}
					totalDays += targetDay;
					return totalDays;
				}
				totalDays += H.getDaysInMonth(baseMonth, baseYear) - baseDay;
				for (let m = baseMonth + 1; m <= calendar.months.length; m++) {
					totalDays += H.getDaysInMonth(m, baseYear);
				}
				for (let y = baseYear + 1; y < targetYear; y++) {
					totalDays += H.getTotalDaysInYear(y);
				}
				for (let m = 1; m < targetMonth; m++) {
					totalDays += H.getDaysInMonth(m, targetYear);
				}
				totalDays += targetDay;
				return totalDays;
			},
			isEventToday: (event, eventID) => {
				if (!event.enabled) return [];
				let { date, repeatable, frequency, name, weekdayname } = event;
				let [eventYear, eventMonth, eventDay] = date.split("-").map(Number);
				const [currentYear, currentMonth, currentDay] = QUEST_TRACKER_currentDate.split("-").map(Number);
				if (!repeatable) {
					return date === QUEST_TRACKER_currentDate ? [[QUEST_TRACKER_currentDate, name, eventID]] : [];
				}

				const freqType = frequencyMapping[frequency];
				switch (freqType) {
					case "Daily":
						return [[QUEST_TRACKER_currentDate, name, eventID]];
					case "Weekly":
						if (weekdayname && weekdayname === QUEST_TRACKER_currentWeekdayName) {
							return [[QUEST_TRACKER_currentDate, name, eventID]];
						}
						break;
					case "Monthly":
						const daysInMonth = H.getDaysInMonth(currentMonth, currentYear);
						if (eventDay <= daysInMonth && eventMonth === currentMonth && eventDay === currentDay) {
							return [[QUEST_TRACKER_currentDate, name, eventID]];
						}
						break;
					case "Yearly":
						if (eventMonth === currentMonth && eventDay === currentDay) {
							return [[QUEST_TRACKER_currentDate, name, eventID]];
						}
						break;
				}
				return [];
			},
			findNextEvents: (limit = 1, isToday = false) => {
				const calendar = CALENDARS[QUEST_TRACKER_calenderType];
				const daysOfWeek = calendar.daysOfWeek || [];
				const specialDays = calendar.significantDays || {};
				const events = QUEST_TRACKER_Events || {};
				const [currentYear, currentMonth, currentDay] = QUEST_TRACKER_currentDate.split("-").map(Number);
				let upcomingEvents = [];
				const todayEvents = [];
				if (isToday) {
					Object.entries(events).forEach(([eventID, event]) => {
						if (!event.enabled) return;
						const todaysOccurrences = H.isEventToday(event, eventID);
						todayEvents.push(...todaysOccurrences);
					});
					Object.entries(specialDays).forEach(([key, name]) => {
						const [eventMonth, eventDay] = key.split("-").map(Number);
						if (eventMonth === currentMonth && eventDay === currentDay) {
							todayEvents.push([QUEST_TRACKER_currentDate, name, null]);
						}
					});
					return todayEvents;
				}
				const calculateNextOccurrences = (event, eventID, maxOccurrences) => {
					let { date, repeatable, frequency, name, weekdayname } = event;
					let [startYear, startMonth, startDay] = date.split("-").map(Number);
					let [currentYear, currentMonth, currentDay] = QUEST_TRACKER_currentDate.split("-").map(Number);
					let [eventYear, eventMonth, eventDay] = [startYear, startMonth, startDay];
					const occurrences = [];
					const freqType = repeatable ? frequencyMapping[frequency] : null;
					if (repeatable) {
						if (`${startYear}-${String(startMonth).padStart(2, "0")}-${String(startDay).padStart(2, "0")}` < QUEST_TRACKER_currentDate) {
							[eventYear, eventMonth, eventDay] = [currentYear, currentMonth, currentDay];
						}
						switch (freqType) {
							case "Daily":
								break;
							case "Weekly":
								if (weekdayname) {
									const targetWeekdayIndex = daysOfWeek.indexOf(weekdayname);
									const currentWeekdayIndex = daysOfWeek.indexOf(QUEST_TRACKER_currentWeekdayName);
									let daysToAdd = (targetWeekdayIndex - currentWeekdayIndex + daysOfWeek.length) % daysOfWeek.length;
									if (daysToAdd === 0 && (eventYear === currentYear && eventMonth === currentMonth && eventDay === currentDay)) {
										daysToAdd = daysOfWeek.length;
									}
									eventDay += daysToAdd;
									if (eventDay > H.getDaysInMonth(eventMonth, eventYear)) {
										eventDay -= H.getDaysInMonth(eventMonth, eventYear);
										eventMonth++;
										if (eventMonth > calendar.months.length) {
											eventMonth = 1;
											eventYear++;
										}
									}
								}
								break;
							case "Monthly":
								while (
									eventYear < currentYear ||
									(eventYear === currentYear && eventMonth < currentMonth)
								) {
									eventMonth++;
									if (eventMonth > calendar.months.length) {
										eventMonth = 1;
										eventYear++;
									}
								}
								eventDay = Math.min(eventDay, H.getDaysInMonth(eventMonth, eventYear));
								break;
							case "Yearly":
								if (eventYear < currentYear) {
									eventYear = currentYear;
								}
								break;
							default:
								break;
						}
					}
					let occurrencesCount = 0;
					while (occurrencesCount < maxOccurrences) {
						const eventDate = `${eventYear}-${String(eventMonth).padStart(2, "0")}-${String(eventDay).padStart(2, "0")}`;
						if (eventDate >= date) {
							occurrences.push([eventDate, name, eventID]);
							occurrencesCount++;
						}
						switch (freqType) {
							case "Daily":
								eventDay++;
								if (eventDay > H.getDaysInMonth(eventMonth, eventYear)) {
									eventDay -= H.getDaysInMonth(eventMonth, eventYear);
									eventMonth++;
									if (eventMonth > calendar.months.length) {
										eventMonth = 1;
										eventYear++;
									}
								}
								break;
							case "Weekly":
								eventDay += daysOfWeek.length;
								if (eventDay > H.getDaysInMonth(eventMonth, eventYear)) {
									eventDay -= H.getDaysInMonth(eventMonth, eventYear);
									eventMonth++;
									if (eventMonth > calendar.months.length) {
										eventMonth = 1;
										eventYear++;
									}
								}
								break;
							case "Monthly":
								eventMonth++;
								if (eventMonth > calendar.months.length) {
									eventMonth = 1;
									eventYear++;
								}
								eventDay = Math.min(eventDay, H.getDaysInMonth(eventMonth, eventYear));
								break;
							case "Yearly":
								eventYear++;
								break;
							default:
								break;
						}
						if (!repeatable) break;
					}
					return occurrences;
				};
				Object.entries(events).forEach(([eventID, event]) => {
					if (!event.enabled) return;
					const eventOccurrences = calculateNextOccurrences(event, eventID, 5);
					upcomingEvents.push(...eventOccurrences);
				});
				Object.entries(specialDays).forEach(([key, name]) => {
					const [eventMonth, eventDay] = key.split("-").map(Number);
					let eventYear = currentYear;
					if (eventMonth < currentMonth || (eventMonth === currentMonth && eventDay < currentDay)) {
						eventYear++;
					}
					if (H.getDaysInMonth(eventMonth, eventYear) >= eventDay) {
						const eventDate = `${eventYear}-${String(eventMonth).padStart(2, "0")}-${String(eventDay).padStart(2, "0")}`;
						if (isToday) {
							if (eventDate === QUEST_TRACKER_currentDate) {
								todayEvents.push([eventDate, name, null]);
							}
						} else {
							if (eventDate > QUEST_TRACKER_currentDate) {
								upcomingEvents.push([eventDate, name, null]);
							}
						}
					}
				});
				upcomingEvents.sort((a, b) => {
					const [aYear, aMonth, aDay] = a[0].split("-").map(Number);
					const [bYear, bMonth, bDay] = b[0].split("-").map(Number);
					return H.calculateDateDifference({ year: aYear, month: aMonth, day: aDay }, currentYear, currentMonth, currentDay)
						- H.calculateDateDifference({ year: bYear, month: bMonth, day: bDay }, currentYear, currentMonth, currentDay);
				});

				return upcomingEvents.slice(0, limit);
			},
			calculateWeekday: (year, month, day) => {
				if (errorCheck(23, 'calendar', CALENDARS[QUEST_TRACKER_calenderType])) return;
				const calendar = CALENDARS[QUEST_TRACKER_calenderType];
				if (errorCheck(24, 'calendar.daysOfWeek', calendar.daysOfWeek)) return;
				if (errorCheck(25, 'calendar.startingWeekday', calendar.startingWeekday)) return;
				if (errorCheck(26, 'calendar.startingYear', calendar.startingYear)) return;
				const daysOfWeek = calendar.daysOfWeek;
				const startingWeekday = calendar.startingWeekday;
				const startingYear = calendar.startingYear;
				let totalDays = 0;
				for (let y = startingYear; y < year; y++) {
					totalDays += H.getTotalDaysInYear(y);
				}
				for (let m = 1; m < month; m++) {
					totalDays += typeof calendar.months[m - 1].days === "function"
						? calendar.months[m - 1].days(year)
						: calendar.months[m - 1].days;
				}
				totalDays += day - 1;
				return daysOfWeek[(daysOfWeek.indexOf(startingWeekday) + totalDays) % daysOfWeek.length];
			}
		};
		const determineWeather = (date) => {
			const W = {
				getSeasonBoundaries: (year) => {				
					if (errorCheck(27, 'exists', CALENDARS[QUEST_TRACKER_calenderType]?.climates[QUEST_TRACKER_Location], `CALENDARS[${QUEST_TRACKER_calenderType}]?.climates[${QUEST_TRACKER_Location}]`)) return;
					const climate = CALENDARS[QUEST_TRACKER_calenderType]?.climates[QUEST_TRACKER_Location];
					const boundaries = [];
					const seasonStart = climate.seasonStart || {};
					for (const [seasonName, startMonth] of Object.entries(seasonStart)) {
						let startDayOfYear = 0;
						const calendar = CALENDARS[QUEST_TRACKER_calenderType];
						for (let i = 0; i < startMonth - 1; i++) {
							const monthObj = calendar.months[i];
							startDayOfYear += typeof monthObj.days === "function" ? monthObj.days(year) : monthObj.days;
						}
						boundaries.push({ season: seasonName, startDayOfYear });
					}
					boundaries.sort((a, b) => a.startDayOfYear - b.startDayOfYear);
					const totalDaysInYear = H.getTotalDaysInYear(year);
					boundaries.forEach((boundary, i) => {
						const nextIndex = (i + 1) % boundaries.length;
						boundary.endDayOfYear =
							boundaries[nextIndex].startDayOfYear - 1 >= 0
								? boundaries[nextIndex].startDayOfYear - 1
								: totalDaysInYear - 1;
					});
					return boundaries;
				},
				getCurrentSeason: (date) => {
					const [year, month, day] = date.split("-").map(Number);
					const boundaries = W.getSeasonBoundaries(year);
					if (!boundaries || boundaries.length === 0) return null;
					let dayOfYear = 0;
					const calendar = CALENDARS[QUEST_TRACKER_calenderType];
					for (let i = 0; i < month - 1; i++) {
						const monthObj = calendar.months[i];
						dayOfYear += typeof monthObj.days === "function" ? monthObj.days(year) : monthObj.days;
					}
					dayOfYear += day;
					for (const { season, startDayOfYear, endDayOfYear } of boundaries) {
						if (startDayOfYear <= endDayOfYear) {
							if (dayOfYear >= startDayOfYear && dayOfYear <= endDayOfYear) {
								return { season, dayOfYear };
							}
						} else {
							if (dayOfYear >= startDayOfYear || dayOfYear <= endDayOfYear) {
								return { season, dayOfYear };
							}
						}
					}
					return null;
				},
				getSuddenSeasonalChangeProbability: (dayOfYear, boundaries) => {
					const buffer = 5;
					for (const { startDayOfYear, endDayOfYear } of boundaries) {
						if (Math.abs(dayOfYear - startDayOfYear) <= buffer || Math.abs(dayOfYear - endDayOfYear) <= buffer) {
							return 0.25;
						}
					}
					return 0.05;
				},
				applyForcedTrends: (rolls) => {
					const { temperatureRoll, precipitationRoll, windRoll, humidityRoll, visibilityRoll, cloudCoverRoll } = rolls;
					return {
						temperatureRoll: QUEST_TRACKER_FORCED_WEATHER_TRENDS.heat
							? Math.min(100, temperatureRoll + 20)
							: QUEST_TRACKER_FORCED_WEATHER_TRENDS.cold
							? Math.max(1, temperatureRoll - 20)
							: temperatureRoll,
						precipitationRoll: QUEST_TRACKER_FORCED_WEATHER_TRENDS.wet
							? Math.min(100, precipitationRoll + 20)
							: QUEST_TRACKER_FORCED_WEATHER_TRENDS.dry
							? Math.max(1, precipitationRoll - 20)
							: precipitationRoll,
						windRoll: QUEST_TRACKER_FORCED_WEATHER_TRENDS.wind
							? Math.min(100, windRoll + 20)
							: windRoll,
						humidityRoll: QUEST_TRACKER_FORCED_WEATHER_TRENDS.humid
							? Math.min(100, humidityRoll + 20)
							: humidityRoll,
						visibilityRoll: QUEST_TRACKER_FORCED_WEATHER_TRENDS.visibility
							? Math.min(100, visibilityRoll + 20)
							: visibilityRoll,
						cloudCoverRoll: QUEST_TRACKER_FORCED_WEATHER_TRENDS.cloudy
							? Math.min(100, cloudCoverRoll + 20)
							: cloudCoverRoll,
					};
				},
				applyTrends: (rolls) => {
					const { temperatureRoll, precipitationRoll, windRoll, humidityRoll, visibilityRoll, cloudCoverRoll } = rolls;
					return {
						temperatureRoll:
							temperatureRoll +
							(QUEST_TRACKER_WEATHER_TRENDS.heat || 0) * 2 -
							(QUEST_TRACKER_WEATHER_TRENDS.cold || 0) * 2,
						precipitationRoll:
							precipitationRoll +
							(QUEST_TRACKER_WEATHER_TRENDS.wet || 0) * 2 -
							(QUEST_TRACKER_WEATHER_TRENDS.dry || 0) * 2,
						windRoll: windRoll + (QUEST_TRACKER_WEATHER_TRENDS.wind || 0) * 2,
						humidityRoll: humidityRoll + (QUEST_TRACKER_WEATHER_TRENDS.humid || 0) * 2,
						visibilityRoll: visibilityRoll + (QUEST_TRACKER_WEATHER_TRENDS.visibility || 0) * 2,
						cloudCoverRoll: cloudCoverRoll + (QUEST_TRACKER_WEATHER_TRENDS.cloudy || 0) * 2,
					};
				},
				updateTrends: (rolls) => {
					["heat", "cold", "wet", "dry", "wind", "visibility", "cloudy"].forEach((trendType) => {
						const roll = rolls[`${trendType}Roll`];
						if (["wind", "visibility", "cloudy"].includes(trendType) && roll < 75) {
							QUEST_TRACKER_WEATHER_TRENDS[trendType] = 0;
						} else if (roll > 75) {
							QUEST_TRACKER_WEATHER_TRENDS[trendType] =
								(QUEST_TRACKER_WEATHER_TRENDS[trendType] || 0) + 1;
						} else if (QUEST_TRACKER_WEATHER_TRENDS[trendType]) {
							QUEST_TRACKER_WEATHER_TRENDS[trendType] = 0;
						}
					});
					if (rolls.precipitationRoll > 75) QUEST_TRACKER_WEATHER_TRENDS.dry = 0;
					if (rolls.temperatureRoll > 75) QUEST_TRACKER_WEATHER_TRENDS.cold = 0;
					if (rolls.temperatureRoll < 25) QUEST_TRACKER_WEATHER_TRENDS.heat = 0;
				},
				generateBellCurveRoll: (adj = 0) => {
					const randomGaussian = () => {
						let u = 0, v = 0;
						while (u === 0) u = Math.random();
						while (v === 0) v = Math.random();
						return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
					};
					const center = 50 + adj;
					const lowerBound = Math.max(0, center - 25);
					const upperBound = Math.min(100, center + 25);
					let roll = Math.random() * (upperBound - lowerBound) + lowerBound;
					let bias = roll <= center
						? Math.pow((roll - lowerBound) / (center - lowerBound), 2)
						: Math.pow((upperBound - roll) / (upperBound - center), 2);
					if (Math.random() < bias) {
						return Math.round(roll * 100) / 100;
					} else {
						return W.generateBellCurveRoll(adj);
					}
				},
				adjustDailyFluctuation: (date, trendAdjustedRolls, suddenChangeProbability, seasonBoundary) => {
					const previousWeather = QUEST_TRACKER_HISTORICAL_WEATHER[Object.keys(QUEST_TRACKER_HISTORICAL_WEATHER).reverse().find(d => d < date)];
					if (!previousWeather) return trendAdjustedRolls;
					const maxChange = suddenChangeProbability > 0.05 ? 10 : 5;
					const maxBoundaryChange = suddenChangeProbability > 0.05 ? 20 : 10;
					const adjustedRolls = { ...trendAdjustedRolls };
					Object.keys(adjustedRolls).forEach((key) => {
						const prevValue = previousWeather[key];
						if (prevValue !== undefined) {
							const boundaryLimit = seasonBoundary ? maxBoundaryChange : maxChange;
							const change = adjustedRolls[key] - prevValue;
							if (Math.abs(change) > boundaryLimit) {
								adjustedRolls[key] = prevValue + Math.sign(change) * boundaryLimit;
							}
						}
					});
					return adjustedRolls;
				}
			};
			const [year, month, day] = date.split("-").map(Number);
			const currentSeasonData = W.getCurrentSeason(date);
			if (!currentSeasonData) return;
			const { season, dayOfYear } = currentSeasonData;
			const boundaries = W.getSeasonBoundaries(year);
			const suddenChangeProbability = W.getSuddenSeasonalChangeProbability(dayOfYear, boundaries);
			const rolls = {
				temperatureRoll: W.generateBellCurveRoll(),
				precipitationRoll: W.generateBellCurveRoll(),
				windRoll: W.generateBellCurveRoll(-15),
				humidityRoll: W.generateBellCurveRoll(),
				visibilityRoll: W.generateBellCurveRoll(15),
				cloudCoverRoll: W.generateBellCurveRoll(),
			};
			const forcedAdjustedRolls = W.applyForcedTrends(rolls);
			const trendAdjustedRolls = W.applyTrends(forcedAdjustedRolls);
			W.updateTrends(trendAdjustedRolls);
			const climateModifiers = CALENDARS[QUEST_TRACKER_calenderType]?.climates[QUEST_TRACKER_Location]?.modifiers;
			trendAdjustedRolls.temperatureRoll += climateModifiers?.temperature?.[season] || 0;
			trendAdjustedRolls.precipitationRoll += climateModifiers?.precipitation?.[season] || 0;
			trendAdjustedRolls.windRoll += climateModifiers?.wind?.[season] || 0;
			trendAdjustedRolls.humidityRoll += climateModifiers?.humid?.[season] || 0;
			trendAdjustedRolls.visibilityRoll += climateModifiers?.visibility?.[season] || 0;
			const nearBoundary = suddenChangeProbability > 0.05;
			const isBoundaryDay = boundaries.some(({ startDayOfYear, endDayOfYear }) =>
				Math.abs(dayOfYear - startDayOfYear) <= 1 || Math.abs(dayOfYear - endDayOfYear) <= 1
			);
			const finalAdjustedRolls = W.adjustDailyFluctuation(date, trendAdjustedRolls, suddenChangeProbability, isBoundaryDay);
			Object.keys(finalAdjustedRolls).forEach((key) => {
				finalAdjustedRolls[key] = Math.max(1, Math.min(100, finalAdjustedRolls[key]));
			});
			const weather = {
				date,
				season,
				...finalAdjustedRolls,
				trends: { ...QUEST_TRACKER_WEATHER_TRENDS },
				forcedTrends: { ...QUEST_TRACKER_FORCED_WEATHER_TRENDS },
				nearBoundary,
			};
			QUEST_TRACKER_HISTORICAL_WEATHER[date] = weather;
			saveQuestTrackerData();
			Utils.updateHandoutField("weather");
		};
		const modifyDate = ({ type = "day", amount = 1, newDate = null }) => {
			const calendar = CALENDARS[QUEST_TRACKER_calenderType];
			if (errorCheck(28, 'exists', calendar,'calendar')) return;
			const L = {
				formatDate: (year, month, day) => {
					return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
				},
				wrapAround: () => {
					while (day > H.getDaysInMonth(month, year)) {
						day -= H.getDaysInMonth(month, year);
						month++;
						if (month > calendar.months.length) {
							month = 1;
							year++;
						}
					}
					while (day < 1) {
						month--;
						if (month < 1) {
							month = calendar.months.length;
							year--;
						}
						day += H.getDaysInMonth(month, year);
					}
				},
				generateDateArray: () => {
					const dates = [];
					let targetDate = null;
					if (type === "event") {
						const closestEvent = H.findNextEvents(1);
						if (!closestEvent || closestEvent.length === 0) {
							Utils.sendGMMessage("No upcoming festivals, events, or significant dates found.");
							return [];
						}
						targetDate = closestEvent[0][0];
					}
					while (steps >= 0 || targetDate) {
						dates.push(L.formatDate(year, month, day));
						if (type === "event" && targetDate) {
							const [targetYear, targetMonth, targetDay] = targetDate.split("-").map(Number);
							while (
								year !== targetYear ||
								month !== targetMonth ||
								day !== targetDay
							) {
								day += direction;
								L.wrapAround();
								dates.push(L.formatDate(year, month, day));
							}
							break;
						}
						switch (type) {
							case "day":
								day += direction;
								L.wrapAround();
								break;
							case "week":
								day += direction * calendar.daysOfWeek.length;
								L.wrapAround();
								break;
							case "month":
								month += direction;
								if (month > calendar.months.length) {
									month -= calendar.months.length;
									year++;
								} else if (month < 1) {
									month += calendar.months.length;
									year--;
								}
								day = Math.min(day, H.getDaysInMonth(month, year));
								break;
							case "year":
								year += direction;
								day = Math.min(day, H.getDaysInMonth(month, year));
								break;
							default:
								break;
						}
						steps--;
					}
					return dates;
				},
				generateCompleteDateList: (startDate, endDate) => {
					const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
					const [endYear, endMonth, endDay] = endDate.split("-").map(Number);
					let currentYear = startYear, currentMonth = startMonth, currentDay = startDay;
					const dateList = [];
					while (
						currentYear < endYear ||
						(currentYear === endYear && currentMonth < endMonth) ||
						(currentYear === endYear && currentMonth === endMonth && currentDay <= endDay)
					) {
						dateList.push(L.formatDate(currentYear, currentMonth, currentDay));
						currentDay++;
						if (currentDay > H.getDaysInMonth(currentMonth, currentYear)) {
							currentDay = 1;
							currentMonth++;
							if (currentMonth > calendar.months.length) {
								currentMonth = 1;
								currentYear++;
							}
						}
					}
					dateList.push(L.formatDate(endYear, endMonth, endDay));
					return dateList;
				},
				validateISODate: (date) => {
					const [y, m, d] = date.split("-").map(Number);
					if (!y || !m || !d || m < 1 || m > calendar.months.length) {
						errorCheck(29, 'msg', null,`Invalid ISO date format or date out of range for calendar: ${date}`);
						return null;
					}
					const daysInMonth = H.getDaysInMonth(m, y);
					if (d < 1 || d > daysInMonth) {
						errorCheck(30, 'msg', null,`Day out of range for the specified month: ${date}`);
						return null;
					}
					return { year: y, month: m, day: d };
				},
				isAfterCurrentDate: (eventYear, eventMonth, eventDay) => {
					if (eventYear > year) return true;
					if (eventYear === year && eventMonth > month) return true;
					if (eventYear === year && eventMonth === month && eventDay > day) return true;
					return false;
				}
			};
			let [year, month, day] = QUEST_TRACKER_currentDate.split("-").map(Number);
			if (type === "set") {
				const { year: newYear, month: newMonth, day: newDay } = L.validateISODate(newDate);
				QUEST_TRACKER_currentDate = L.formatDate(newYear, newMonth, newDay);
				saveQuestTrackerData();
				return;
			}
			let steps = Math.abs(amount);
			let direction = Math.sign(amount);
			const dateArray = L.generateDateArray();
			if (QUEST_TRACKER_WEATHER && dateArray.length > 0) {
				dateArray.forEach((date) => {
					if (!QUEST_TRACKER_HISTORICAL_WEATHER[date]) {
						determineWeather(date);
					}
				});
			}
			const [finalYear, finalMonth, finalDay] = dateArray[dateArray.length - 1].split("-").map(Number);
			year = finalYear;
			month = finalMonth;
			day = finalDay;
			QUEST_TRACKER_currentDate = L.formatDate(year, month, day);
			QUEST_TRACKER_currentWeekdayName = H.calculateWeekday(year, month, day);
			H.checkEvent();
			Triggers.checkTriggers('date');
			describeWeather();
			saveQuestTrackerData();
			Utils.sendMessage(`Date is now: ${Calendar.formatDateFull()}`)
			Utils.sendDescMessage(QUEST_TRACKER_CURRENT_WEATHER['description']);
			Menu.buildWeather({ isMenu: false });
		};
		const addEvent = () => {
			const newEventId = H.generateNewEventId();
			const defaultEventData = {
				name: 'New Event',
				description: 'Description',
				date: `${QUEST_TRACKER_defaultDate}`,
				hidden: true,
				enabled: false,
				repeatable: false,
				frequency: null
			};
			QUEST_TRACKER_Events[newEventId] = defaultEventData;
			Utils.updateHandoutField('event');
		};
		const getNextEvents = (number) => {
			return H.findNextEvents(number);
		};
		const removeEvent = (eventId) => {
			delete QUEST_TRACKER_Events[eventId];
			Utils.updateHandoutField('event');
		};
		const manageEventObject = ({ action, field, current, old = '', newItem, date }) => {
			const event = QUEST_TRACKER_Events[current];
			switch (field) {
				case 'hidden':
					event.hidden = !event.hidden;
					break;
				case 'enabled':
					event.enabled = !event.enabled;
					break;
				case 'repeatable':
					event.repeatable = !event.repeatable;
					event.frequency = 1;
					break;
				case 'frequency':
					event.frequency = newItem;
					if (newItem === "2") {
						const [year, month, day] = date.split("-").map(Number);
						event.weekdayname = H.calculateWeekday(year, month, day);
					}
					break;
				case 'name':
					event.name = newItem;
					break;
				case 'date':
					event.date = newItem;
					if (event.frequency === "2" && event.repeatable) {
						const [year, month, day] = newItem.split("-").map(Number);
						event.weekdayname = H.calculateWeekday(year, month, day);
					}
					break;
				case 'description':
					event.description = newItem;
					break;
				default:
					errorCheck(31, 'msg', null,`Unknown field command: ${field}`);
					break;
			}
			Utils.updateHandoutField('event');
		};
		const setCalender = (calender) => {
			QUEST_TRACKER_calenderType = calender;
			const calendar = CALENDARS[calender];
			QUEST_TRACKER_currentDate = calendar.defaultDate;
			QUEST_TRACKER_defaultDate = calendar.defaultDate;
			const [year, month, day] = QUEST_TRACKER_currentDate.split("-").map(Number);
			QUEST_TRACKER_currentWeekdayName = H.calculateWeekday(year, month, day);
			const firstClimate = Object.keys(calendar.climates)[0];
			if (firstClimate) {
				setClimate(firstClimate);
			}
			saveQuestTrackerData();
		};
		const setClimate = (climate) => {
			const calendar = CALENDARS[QUEST_TRACKER_calenderType];
			QUEST_TRACKER_Location = climate;
			saveQuestTrackerData();
		};
		const setWeatherTrend = (type, amount) => {
			QUEST_TRACKER_WEATHER_TRENDS[type] = parseInt(QUEST_TRACKER_WEATHER_TRENDS[type], 10) || 0;
			amount = parseInt(amount, 10);
			QUEST_TRACKER_WEATHER_TRENDS[type] += amount;
			saveQuestTrackerData();
		};
		const formatDateFull = () => {
			const [year, month, day] = QUEST_TRACKER_currentDate.split("-").map(Number);
			const calendar = CALENDARS[QUEST_TRACKER_calenderType];
			const monthName = calendar.months[month - 1].name;
			const format = calendar.dateFormat || "{day}{ordinal} of {month}, {year}";
			const ordinal = (n) => {
				const s = ["th", "st", "nd", "rd"];
				const v = n % 100;
				return s[(v - 20) % 10] || s[v] || s[0];
			};
			return format
				.replace("{day}", day)
				.replace("{ordinal}", ordinal(day))
				.replace("{month}", monthName)
				.replace("{year}", year);
		};
		const forceWeatherTrend = (field) => {
			const fieldList = ["dry", "wet", "heat", "cold"];
			const isCurrentlyTrue = QUEST_TRACKER_FORCED_WEATHER_TRENDS[field];
			QUEST_TRACKER_FORCED_WEATHER_TRENDS[field] = !isCurrentlyTrue;
			if (QUEST_TRACKER_FORCED_WEATHER_TRENDS[field] === true) {
				fieldList
					.filter((f) => f !== field)
					.forEach((f) => {
						QUEST_TRACKER_FORCED_WEATHER_TRENDS[f] = false;
					});
			}
			saveQuestTrackerData();
		};
		const getLunarPhase = (date, moonId) => {
			const calendar = CALENDARS[QUEST_TRACKER_calenderType];
			if (errorCheck(153, 'exists', calendar.lunarCycle, `calendar.lunarCycle`)) return;
			if (errorCheck(154, 'exists', calendar.lunarCycle[moonId], `calendar.lunarCycle[${moonId}]`)) return;
			const { baselineNewMoon, cycleLength, phases, name } = calendar.lunarCycle[moonId];
			const baselineDate = new Date(baselineNewMoon);
			const currentDate = new Date(date);
			const daysSinceBaseline = (currentDate - baselineDate) / (1000 * 60 * 60 * 24);
			const phase = (daysSinceBaseline % cycleLength + cycleLength) % cycleLength;
			for (const { name: phaseName, start, end } of phases) {
				if (phase >= start && phase < end) {
					return `${name}: ${phaseName}`;
				}
			}
			return `${name}: Unknown Phase`;
		};
		const describeWeather = () => {
			const L = {
				meetsCondition: (value, cond) => {
					if (cond.gte !== undefined && value < cond.gte) return false;
					if (cond.lte !== undefined && value > cond.lte) return false;
					return true;
				},
				matchesConditions: (rolls, conditions, ignoreKeys = []) => {
					for (const [metric, cond] of Object.entries(conditions)) {
						if (ignoreKeys.includes(metric)) continue;
						const val = rolls[metric];
						if (val === undefined) return false;
						if (!L.meetsCondition(val, cond)) return false;
					}
					return true;
				},
				countMatches: (rolls, conditions, ignoreKeys = []) => {
					let matchCount = 0;
					for (const [metric, cond] of Object.entries(conditions)) {
						if (ignoreKeys.includes(metric)) continue;
						const val = rolls[metric];
						if (val !== undefined && L.meetsCondition(val, cond)) {
							matchCount++;
						}
					}
					return matchCount;
				},
				determineWeatherType: (rolls) => {
					const WEATHER_TYPES = WEATHER.weather;
					let matches = [];
					for (const [typeName, typeData] of Object.entries(WEATHER_TYPES)) {
						if (L.matchesConditions(rolls, typeData.conditions)) {
							matches.push(typeName);
						}
					}
					if (matches.length > 0) {
						const chosenMatch = matches[Math.floor(Math.random() * matches.length)];
						return { type: chosenMatch };
					}
					matches = [];
					for (const [typeName, typeData] of Object.entries(WEATHER_TYPES)) {
						if (L.matchesConditions(rolls, typeData.conditions, ['visibility'])) {
							matches.push(typeName);
						}
					}
					if (matches.length > 0) {
						const chosenMatch = matches[Math.floor(Math.random() * matches.length)];
						return { type: chosenMatch };
					}
					matches = [];
					for (const [typeName, typeData] of Object.entries(WEATHER_TYPES)) {
						if (L.matchesConditions(rolls, typeData.conditions, ['visibility', 'cloudCover'])) {
							matches.push(typeName);
						}
					}
					if (matches.length > 0) {
						const chosenMatch = matches[Math.floor(Math.random() * matches.length)];
						return { type: chosenMatch };
					}
					let bestType = null;
					let bestCount = -1;
					for (const [typeName, typeData] of Object.entries(WEATHER_TYPES)) {
						const count = L.countMatches(rolls, typeData.conditions);
						if (count > bestCount) {
							bestCount = count;
							bestType = typeName;
						}
					}
					if (bestType) {
						return { type: bestType };
					}
					return { type: "unclassified normal weather" };
				},
				getScaleDescription: (metric, value) => {
					const scaleEntries = Object.entries(WEATHER.scales[metric]);
					const numericKeys = scaleEntries.map(([k]) => parseInt(k,10)).sort((a,b) => a - b);
					let chosenKey = numericKeys[0];
					for (let k of numericKeys) {
						if (k <= value) {
							chosenKey = k;
						} else {
							break;
						}
					}
					return WEATHER.scales[metric][chosenKey.toString()].description;
				}
			};
			const todayWeather = QUEST_TRACKER_HISTORICAL_WEATHER[QUEST_TRACKER_currentDate];
			if (!todayWeather) return;
			const rolls = {
				temperature: todayWeather.temperatureRoll,
				precipitation: todayWeather.precipitationRoll,
				wind: todayWeather.windRoll,
				humidity: todayWeather.humidityRoll,
				cloudCover: todayWeather.cloudCoverRoll,
				visibility: todayWeather.visibilityRoll
			};
			const result = L.determineWeatherType(rolls);
			const chosenType = result.type;
			let chosenWeatherData;
			if (WEATHER.weather[chosenType]) {
				chosenWeatherData = WEATHER.weather[chosenType];
			} else {
				chosenWeatherData = {
					descriptions: {
						[QUEST_TRACKER_WeatherLocation]: {
							"1": "Unclassified normal weather conditions."
						}
					}
				};
			}
			const envDescriptions = chosenWeatherData.descriptions[QUEST_TRACKER_WeatherLocation] || { "1": "No description available." };
			const envDescriptionKeys = Object.keys(envDescriptions);
			const randomDescKey = envDescriptionKeys[Math.floor(Math.random() * envDescriptionKeys.length)];
			const chosenDescription = envDescriptions[randomDescKey];
			QUEST_TRACKER_CURRENT_WEATHER = {
				weatherType: chosenType,
				description: chosenDescription,
				environment: WEATHER.enviroments[QUEST_TRACKER_WeatherLocation] ? WEATHER.enviroments[QUEST_TRACKER_WeatherLocation].name : QUEST_TRACKER_WeatherLocation,
				rolls: { ...rolls },
				scaleDescriptions: {
					temperature: L.getScaleDescription("temperature", rolls.temperature),
					humidity: L.getScaleDescription("humidity", rolls.humidity),
					wind: L.getScaleDescription("wind", rolls.wind),
					precipitation: L.getScaleDescription("precipitation", rolls.precipitation),
					cloudCover: L.getScaleDescription("cloudCover", rolls.cloudCover),
					visibility: L.getScaleDescription("visibility", rolls.visibility)
				}
			};
		};
		const adjustLocation = (location) => {
			if (WEATHER.enviroments.hasOwnProperty(location)) {
				QUEST_TRACKER_WeatherLocation = location;
				saveQuestTrackerData();
			} else return;
		};
		const convertEventsToNewFormat = () => {
			if (QUEST_TRACKER_versionChecking.EventConversion) return;
			let eventsConverted = false;
			if (!QUEST_TRACKER_Events || typeof QUEST_TRACKER_Events !== "object") return;
			Object.entries(QUEST_TRACKER_Events).forEach(([eventID, event]) => {
				if (!event.hasOwnProperty("enabled")) {
					event.enabled = true;
					eventsConverted = true;
				}
			});
			QUEST_TRACKER_versionChecking.EventConversion = true; 
			if (eventsConverted) {
				errorCheck(237, 'msg', null, `Events converted to include 'enabled' field (v1.2 update).`);
				Utils.updateHandoutField("event");
				saveQuestTrackerData();
			}
		};
		return {
			modifyDate,
			addEvent,
			removeEvent,
			manageEventObject,
			setCalender,
			formatDateFull,
			setClimate,
			setWeatherTrend,
			forceWeatherTrend,
			getLunarPhase,
			getNextEvents,
			adjustLocation,
			convertEventsToNewFormat
		};
	})();
	const QuestPageBuilder = (() => {
		const vars = {
			DEFAULT_PAGE_UNIT: 70,
			AVATAR_SIZE: 70,
			TEXT_FONT_SIZE: 12,
			PAGE_HEADER_WIDTH: 700,
			PAGE_HEADER_HEIGHT: 150,
			ROUNDED_RECT_WIDTH: 400,
			ROUNDED_RECT_HEIGHT: 80,
			ROUNDED_RECT_CORNER_RADIUS: 10,
			VERTICAL_SPACING: 100,
			HORIZONTAL_SPACING: 160,
			DEFAULT_FILL_COLOR: '#CCCCCC',
			DEFAULT_STATUS_COLOR: '#000000',
			QUESTICON_WIDTH: 305,
			GROUP_SPACING: 800,
			QUESTICON_HEIGHT: 92,
			PAGE_X_OFFSET: 360,
			HORIZONTAL_GROUP_SPACING: 100,
			CANVAS_PADDING: 100
		};
		const H = {
			adjustPageSettings: (page) => {
				page.set({
					showgrid: false,
					snapping_increment: 0,
					diagonaltype: 'facing',
					scale_number: 1,
				});
			},
			adjustPageSizeToFitPositions: (page, questPositions) => {
				const positions = Object.values(questPositions);
				if (positions.length === 0) return;
				const minX = Math.min(...positions.map(pos => pos.x));
				const maxX = Math.max(...positions.map(pos => pos.x));
				const minY = Math.min(...positions.map(pos => pos.y));
				const maxY = Math.max(...positions.map(pos => pos.y));
				const requiredWidthInPixels = (maxX - minX) + vars.ROUNDED_RECT_WIDTH + vars.HORIZONTAL_SPACING * 2;
				const requiredHeightInPixels = (maxY - minY) + vars.ROUNDED_RECT_HEIGHT + vars.VERTICAL_SPACING * 2 + vars.PAGE_HEADER_HEIGHT;
				const requiredWidthInUnits = Math.ceil(requiredWidthInPixels / vars.DEFAULT_PAGE_UNIT);
				const requiredHeightInUnits = Math.ceil(requiredHeightInPixels / vars.DEFAULT_PAGE_UNIT);
				page.set({ width: requiredWidthInUnits, height: requiredHeightInUnits });
			},
			clearPageObjects: (pageId, callback) => {
				const pageElements = [
					...findObjs({ _type: 'graphic', _pageid: pageId }),
					...findObjs({ _type: 'path', _pageid: pageId }),
					...findObjs({ _type: 'text', _pageid: pageId })
				];
				pageElements.forEach(obj => obj.remove());
				if (typeof callback === 'function') callback();
			},
			buildPageHeader: (page) => {
				const titleText = 'Quest Tracker Quest Tree';
				const descriptionText = 'A visual representation of all quests.';
				const pageWidth = page.get('width') * vars.DEFAULT_PAGE_UNIT;
				const titleX = pageWidth / 2;
				const titleY = 70;
				D.drawText(page.id, titleX, titleY, titleText, '#000000', 'map', 32, 'Contrail One', null, 'center', 'middle');
				const descriptionY = titleY + 40;
				D.drawText(page.id, titleX, descriptionY, descriptionText, '#666666', 'map', 18, 'Contrail One', null, 'center', 'middle');
			},
			storeQuestRef: (questId, type, objRef, target = null) => {
				if (!QUEST_TRACKER_TreeObjRef[questId]) {
					QUEST_TRACKER_TreeObjRef[questId] = { paths: {} };
				}
				if (type === 'paths' && target) {
					if (!QUEST_TRACKER_TreeObjRef[questId][type][target]) {
						QUEST_TRACKER_TreeObjRef[questId][type][target] = [];
					}
					QUEST_TRACKER_TreeObjRef[questId][type][target].push(objRef);
				} else {
					QUEST_TRACKER_TreeObjRef[questId][type] = objRef;
				}
				saveQuestTrackerData();
			},
			replaceImageSize: (imgsrc) => {
				return imgsrc.replace(/\/(med|original|max|min)\.(gif|jpg|jpeg|bmp|webp|png)(\?.*)?$/i, '/thumb.$2$3');
			},
			trimText: (text, maxLength = 150) => {
				if (text.length > maxLength) {
					return text.slice(0, maxLength - 3) + '...';
				}
				return text;
			},
			getStatusColor: (status) => Statuses.getColor(status),
			buildDAG: (questData, vars, forcedRebuild = false) => {
	if (!questData || typeof questData !== 'object' || Object.keys(questData).length === 0) return {};

	const questPositions = {};
	const parentChildMap = {};
	const childParentMap = {};
	const layers = {};
	const nodeLayerMap = {};
	const dummyNodes = [];
	let dummyNodeId = 0;
	const groupOffsets = {};
	const groupMaxWidths = {};
	const horizontalSpacing = vars.HORIZONTAL_GROUP_SPACING;
	const groupMap = {};

	// **If not forcedRebuild, load existing positions and return them**
	if (!forcedRebuild) {
		Object.keys(questData).forEach(questId => {
			if (questData[questId].position) {
				questPositions[questId] = { ...questData[questId].position };
			}
		});
		return questPositions;
	}

	// **Organize quests by group**
	for (const questId in questData) {
		const group = questData[questId].group || 'default';
		if (!groupMap[group]) {
			groupMap[group] = [];
		}
		groupMap[group].push(questId);
	}

	const removeCycles = (group) => {
		const visited = new Set();
		const stack = new Set();
		const reversedEdges = [];

		function visit(node) {
			if (stack.has(node)) return true;
			if (visited.has(node)) return false;
			visited.add(node);
			stack.add(node);
			const children = parentChildMap[node] || [];
			for (const child of children) {
				if (visit(child)) {
					reversedEdges.push([child, node]);
					parentChildMap[child] = parentChildMap[child] || [];
					parentChildMap[child].push(node);
					childParentMap[node] = childParentMap[node] || [];
					childParentMap[node].push(child);
				}
			}
			stack.delete(node);
			return false;
		}

		for (const node of groupMap[group]) {
			visit(node);
		}

		for (const [from, to] of reversedEdges) {
			parentChildMap[to] = parentChildMap[to].filter(child => child !== from);
			if (parentChildMap[to].length === 0) delete parentChildMap[to];
			childParentMap[from] = childParentMap[from].filter(parent => parent !== to);
			if (childParentMap[from].length === 0) delete childParentMap[from];
		}
	};

	const assignLayers = (group) => {
		const inDegree = {};
		const zeroInDegree = [];
		layers[group] = [];

		for (const node of groupMap[group]) {
			inDegree[node] = (childParentMap[node] || []).length;
			if (inDegree[node] === 0) {
				zeroInDegree.push(node);
			}
		}

		while (zeroInDegree.length > 0) {
			const node = zeroInDegree.shift();
			const layer = nodeLayerMap[node] || 0;
			layers[group][layer] = layers[group][layer] || [];
			layers[group][layer].push(node);
			const children = parentChildMap[node] || [];
			for (const child of children) {
				inDegree[child]--;
				if (inDegree[child] === 0) {
					zeroInDegree.push(child);
					nodeLayerMap[child] = layer + 1;
				}
			}
		}
	};

	const assignCoordinates = (group, offsetX) => {
		const layerHeights = layers[group].map(layer => layer.length);
		const maxLayerHeight = Math.max(...layerHeights);
		const layerY = [];
		let currentY = 0;

		for (let i = 0; i < layers[group].length; i++) {
			layerY[i] = currentY;
			currentY += vars.ROUNDED_RECT_HEIGHT + vars.VERTICAL_SPACING;
		}

		let maxWidth = 0;
		const newPositions = {};

		for (let i = 0; i < layers[group].length; i++) {
			const layer = layers[group][i];
			if (!layer || layer.length === 0) continue;
			const totalWidth = layer.length * (vars.ROUNDED_RECT_WIDTH + vars.HORIZONTAL_SPACING);
			let currentX = (-totalWidth / 2) + offsetX;

			for (const node of layer) {
				newPositions[node] = {
					x: isNaN(currentX) ? offsetX : currentX,
					y: isNaN(layerY[i]) ? 0 : layerY[i]
				};
				currentX += vars.ROUNDED_RECT_WIDTH + vars.HORIZONTAL_SPACING;
				maxWidth = Math.max(maxWidth, currentX);
			}
		}

		Object.assign(questPositions, newPositions);
		groupMaxWidths[group] = maxWidth;
	};

	const buildRelationships = (group) => {
		for (const questId of groupMap[group]) {
			const prereqs = questData[questId]?.relationships?.conditions || [];
			for (const prereq of prereqs) {
				if (typeof prereq === 'object' && prereq?.type === 'flag') continue;
				const prereqId = typeof prereq === 'string' ? prereq : prereq?.conditions?.[0];
				if (!prereqId) continue;
				parentChildMap[prereqId] = parentChildMap[prereqId] || [];
				parentChildMap[prereqId].push(questId);
				childParentMap[questId] = childParentMap[questId] || [];
				childParentMap[questId].push(prereqId);
			}
		}
	};

	const shiftXCoordinates = () => {
		let minX = Infinity;
		let maxX = -Infinity;
		Object.values(questPositions).forEach(pos => {
			if (pos.x < minX) minX = pos.x;
			if (pos.x > maxX) maxX = pos.x;
		});
		const totalOffset = minX < 0 ? Math.abs(minX) + vars.CANVAS_PADDING : 0;
		Object.values(questPositions).forEach(pos => {
			pos.x += totalOffset;
		});
	};

	const saveQuestPositions = () => {
		Object.keys(questData).forEach(questId => {
			// **Ensure manual positions are respected**
			if (questData[questId].position?.manual === true) {
				questPositions[questId] = { ...questData[questId].position };
			} else {
				// Add position if missing and set manual to false by default
				if (!questData[questId].position) {
					questData[questId].position = { manual: false };
				}
				questData[questId].position = { ...questPositions[questId], manual: false };
			}
		});
		QUEST_TRACKER_CACHED_QUEST_TREE = true;
		Utils.updateHandoutField('quest');
	};

	let offsetX = 0;
	for (const group in groupMap) {
		buildRelationships(group);
		removeCycles(group);
		assignLayers(group);
		assignCoordinates(group, offsetX);
		groupOffsets[group] = offsetX;
		offsetX += groupMaxWidths[group] + horizontalSpacing;
	}

	shiftXCoordinates();
	saveQuestPositions();
	return questPositions;
}




		};
		const D = {
			drawQuestTreeFromPositions: (page, questPositions, callback) => {
				const totalWidth = page.get('width') * vars.DEFAULT_PAGE_UNIT;
				Object.entries(questPositions).forEach(([questId, position]) => {
					const questData = QUEST_TRACKER_globalQuestData[questId];
					if (!questData) {
						errorCheck(32, 'msg', null,`Quest data for "${questId}" is missing.`);
						return;
					}
					const x = position.x + vars.PAGE_X_OFFSET;
					const y = position.y + vars.PAGE_HEADER_HEIGHT + vars.VERTICAL_SPACING;
					const isHidden = questData.hidden || false;
					D.drawQuestGraphics(questId, questData, page.id, x, y, isHidden);
				});
				if (typeof callback === 'function') callback();
			},
			drawQuestGraphics: (questId, questData, pageId, x, y, isHidden) => {
				const questTable = findObjs({ type: 'rollabletable', name: QUEST_TRACKER_ROLLABLETABLE_QUESTS })[0];
				if (!questTable) {
					errorCheck(33, 'msg', null,`Quests rollable table not found.`);
					return;
				}
				const questTableItems = findObjs({ type: 'tableitem', rollabletableid: questTable.id });
				const questTableItem = questTableItems.find(item => item.get('name').toLowerCase() === questId.toLowerCase());
				if (!questTableItem) {
					errorCheck(34, 'msg', null,`Rollable table item for quest "${questId}" not found.`);
					return;
				}
				const statusWeight = questTableItem.get('weight');
				const statusName = Statuses.getName(statusWeight);
				const statusColor = H.getStatusColor(statusName);
				let imgsrc = questTableItem.get('avatar');
				if (!imgsrc || !imgsrc.includes('https://')) {
					imgsrc = QUEST_TRACKER_BASE_QUEST_ICON_URL;
				} else {
					imgsrc = H.replaceImageSize(imgsrc);
				}
				D.drawRoundedRectangle(pageId, x, y, vars.ROUNDED_RECT_WIDTH, vars.ROUNDED_RECT_HEIGHT, vars.ROUNDED_RECT_CORNER_RADIUS, statusColor, isHidden ? 'gmlayer' : 'map', questId);
				const avatarSpacing = 10;
				const avatarX = x;
				const avatarY = y - (vars.ROUNDED_RECT_HEIGHT / 2) - (vars.AVATAR_SIZE / 2) - avatarSpacing;
				if (imgsrc !== '') D.placeAvatar(pageId, avatarX, avatarY, vars.AVATAR_SIZE, imgsrc, isHidden ? 'gmlayer' : 'objects', questId);
			},
			drawQuestTextAfterGraphics: (page, questPositions) => {
				const totalWidth = page.get('width') * vars.DEFAULT_PAGE_UNIT;
				Object.entries(questPositions).forEach(([questId, position]) => {
					const questData = QUEST_TRACKER_globalQuestData[questId];
					if (!questData) {
						errorCheck(35, 'msg', null,`Quest data for "${questId}" is missing.`);
						return;
					}
					const x = position.x + vars.PAGE_X_OFFSET;
					const y = position.y + vars.PAGE_HEADER_HEIGHT + vars.VERTICAL_SPACING;
					const isHidden = questData.hidden || false;
					const textLayer = isHidden ? 'gmlayer' : 'objects';
					D.drawText(
						page.id,
						x,
						y,
						questData.name,
						'#000000',
						textLayer,
						vars.TEXT_FONT_SIZE,
						'Contrail One',
						questId,
						'center',
						'middle'
					);
				});
			},
			drawQuestConnections: (pageId, questPositions) => {
				const page = getObj('page', pageId);
				const pageWidth = page.get('width') * vars.DEFAULT_PAGE_UNIT;
				const offsetX = vars.PAGE_X_OFFSET;
				const incomingPaths = {};
				Object.entries(questPositions).forEach(([questId, position]) => {
					const questData = QUEST_TRACKER_globalQuestData[questId];
					if (!questData) {
						errorCheck(36, 'msg', null,`Quest data for "${questId}" is missing.`);
						return;
					}
					(questData.relationships?.conditions || []).forEach(prereq => {
						if (typeof prereq === 'object' && prereq?.type === 'flag') return;
						let prereqId = prereq;
						if (typeof prereq === 'object' && prereq.conditions) {
							prereqId = prereq.conditions[0];
						}
						if (!incomingPaths[prereqId]) {
							incomingPaths[prereqId] = [];
						}
						incomingPaths[prereqId].push(questId);
					});
				});
				Object.entries(questPositions).forEach(([questId, position]) => {
					const questData = QUEST_TRACKER_globalQuestData[questId];
					if (!questData) {
						errorCheck(37, 'msg', null,`Quest data for "${questId}" is missing.`);
						return;
					}
					const startX = position.x + offsetX;
					const startY = position.y + vars.PAGE_HEADER_HEIGHT + vars.VERTICAL_SPACING;
					const startPos = {
						x: startX,
						y: startY
					};
					(questData.relationships?.conditions || []).forEach(prereq => {
						if (typeof prereq === 'object' && prereq?.type === 'flag') return;
						let prereqId = prereq;
						if (typeof prereq === 'object' && prereq.conditions) {
							prereqId = prereq.conditions[0];
						}
						const prereqPosition = questPositions[prereqId];
						if (!prereqPosition) return;
						const endX = prereqPosition.x + offsetX;
						const endY = prereqPosition.y + vars.PAGE_HEADER_HEIGHT + vars.VERTICAL_SPACING;
						const endPos = {
							x: endX,
							y: endY
						};
						let midY;
						if (incomingPaths[prereqId].length > 1) {
							midY = endPos.y + vars.VERTICAL_SPACING / 2;
						} else {
							midY = (startPos.y + endPos.y) / 2;
						}
						const isHidden = questData.hidden || QUEST_TRACKER_globalQuestData[prereqId]?.hidden;
						const connectionColor = isHidden ? '#CCCCCC' : '#000000';
						const connectionLayer = isHidden ? 'gmlayer' : 'map';
						D.drawPath(pageId, startPos, endPos, connectionColor, connectionLayer, questId, prereqId, midY);
					});
				});
			},
			drawPath: (pageId, startPos, endPos, color = '#FF0000', layer = 'objects', questId, pathToQuestId, controlY = null, isMutualExclusion = false) => {
				let pathData;
				let left, top, width, height;
				controlY = (controlY === null) ? (startPos.y + endPos.y) / 2 : controlY;
				if (isMutualExclusion) {
					pathData = [
						['M', startPos.x, startPos.y],
						['L', endPos.x, endPos.y]
					];
				} else {
					pathData = [
						['M', startPos.x, startPos.y],
						['L', startPos.x, controlY],
						['L', endPos.x, controlY],
						['L', endPos.x, endPos.y]
					];
				}
				const minX = Math.min(startPos.x, endPos.x);
				const maxX = Math.max(startPos.x, endPos.x);
				const minY = Math.min(startPos.y, endPos.y, controlY);
				const maxY = Math.max(startPos.y, endPos.y, controlY);
				left = (minX + maxX) / 2;
				top = (minY + maxY) / 2;
				width = maxX - minX;
				height = maxY - minY;
				const adjustedPathData = pathData.map(command => {
					const [cmd, ...coords] = command;
					const adjustedCoords = coords.map((coord, index) => {
						return coord - (index % 2 === 0 ? left : top);
					});
					return [cmd, ...adjustedCoords];
				});
				const pathObj = createObj('path', {
					_pageid: pageId,
					layer: layer,
					stroke: color,
					fill: 'transparent',
					path: JSON.stringify(adjustedPathData),
					stroke_width: 2,
					controlledby: '',
					left: left,
					top: top,
					width: width,
					height: height
				});
				if (pathObj) {
					if (isMutualExclusion) {
						H.storeQuestRef(questId, 'mutualExclusion', pathObj.id, pathToQuestId);
						H.storeQuestRef(pathToQuestId, 'mutualExclusion', pathObj.id, questId);
					} else {
						H.storeQuestRef(questId, 'paths', pathObj.id, pathToQuestId);
						H.storeQuestRef(pathToQuestId, 'paths', pathObj.id, questId);
					}
				}
			},
			drawMutuallyExclusiveConnections: (pageId, questPositions) => {
				const page = getObj('page', pageId);
				const pageWidth = page.get('width') * vars.DEFAULT_PAGE_UNIT;
				const offsetX = vars.PAGE_X_OFFSET;
				const mutualExclusions = [];
				Object.entries(QUEST_TRACKER_globalQuestData).forEach(([questId, questData]) => {
					const mutuallyExclusiveWith = questData.relationships?.mutually_exclusive || [];
					mutuallyExclusiveWith.forEach(otherQuestId => {
						if (questId < otherQuestId) {
							mutualExclusions.push([questId, otherQuestId]);
						}
					});
				});
				mutualExclusions.forEach(([questId1, questId2]) => {
					const position1 = questPositions[questId1];
					const position2 = questPositions[questId2];
					if (!position1 || !position2) {
						errorCheck(39, 'msg', null,`Position data for quests "${questId1}" or "${questId2}" is missing.`);
						return;
					}
					const x1 = position1.x + offsetX;
					const y1 = position1.y + vars.PAGE_HEADER_HEIGHT + vars.VERTICAL_SPACING;
					const x2 = position2.x + offsetX;
					const y2 = position2.y + vars.PAGE_HEADER_HEIGHT + vars.VERTICAL_SPACING;
					const startPos = { x: x1, y: y1 };
					const endPos = { x: x2, y: y2 };
					const questData1 = QUEST_TRACKER_globalQuestData[questId1];
					const questData2 = QUEST_TRACKER_globalQuestData[questId2];
					const isHidden = questData1.hidden || questData2.hidden;
					const connectionLayer = isHidden ? 'gmlayer' : 'map';
					D.drawPath(pageId, startPos, endPos, '#FF0000', connectionLayer, questId1, questId2, null, true);
				});
			},
			drawText: (pageId, x, y, textContent, color = '#000000', layer = 'objects', font_size = vars.TEXT_FONT_SIZE, font_family = 'Arial', questId, text_align = 'center', vertical_align = 'middle') => {
				const textObj = createObj('text', {
					_pageid: pageId,
					left: x,
					top: y,
					text: textContent,
					font_size: font_size,
					color: color,
					layer: layer,
					font_family: font_family,
					text_align: text_align
				});
				if (textObj) {
					if (vertical_align !== 'middle') {
						const textHeight = font_size;
						let adjustedTop = y;
						if (vertical_align === 'top') {
							adjustedTop = y - (textHeight / 2);
						} else if (vertical_align === 'bottom') {
							adjustedTop = y + (textHeight / 2);
						}
						textObj.set('top', adjustedTop);
					}
					if (questId) {
						H.storeQuestRef(questId, 'text', textObj.id);
					}
				}
			},
			placeAvatar: (pageId, x, y, avatarSize, imgsrc, layer = 'objects', questId) => {
				const questData = QUEST_TRACKER_globalQuestData[questId];
				let tooltipText = `${questData.description || 'No description available.'}`;
				let trimmedText = H.trimText(tooltipText, 150);
				let handoutLink = questData.handout ? `[Open Handout](http://journal.roll20.net/handout/${questData.handout})` : '';
				const avatarObj = createObj('graphic', {
					_pageid: pageId,
					left: x,
					top: y,
					width: avatarSize,
					height: avatarSize,
					layer: layer,
					imgsrc: imgsrc,
					tooltip: trimmedText,
					controlledby: '',
					gmnotes: `
						[Open Quest](!qt-menu action=quest|id=${questId})
						[Toggle Visibilty](!qt-quest action=update|field=hidden|current=${questId}|old=${questData.hidden}|new=${questData.hidden ? 'false ' : 'true'})
						[Change Status](!qt-quest action=update|field=status|current=${questId}|new=?{Change Status${Statuses.buildDropdown()}})
						<hr>${handoutLink}
					`,
					name: `${questData.name || 'No description available.'}`
				});
				if (avatarObj) {
					H.storeQuestRef(questId, 'avatar', avatarObj.id);
				}
			},
			drawRoundedRectangle: (pageId, x, y, width, height, radius, statusColor, layer = 'objects', questId) => {
				let pathData = [];
				const w = width;
				const h = height;
				pathData = [
					['M', -w / 2, -h / 2],
					['L', w / 2, -h / 2],
					['L', w / 2, h / 2],
					['L', -w / 2, h / 2],
					['L', -w / 2, -h / 2],
					['Z']
				];
				const rectObj = createObj('path', {
					_pageid: pageId,
					layer: layer,
					stroke: statusColor,
					fill: "#FAFAD2",
					path: JSON.stringify(pathData),
					stroke_width: 4,
					controlledby: '',
					left: x,
					top: y,
					width: width,
					height: height
				});
				if (rectObj) {
					H.storeQuestRef(questId, 'rectangle', rectObj.id);
				}
			},
			redrawQuestText: (questId) => {
				let pageObj = findObjs({ _type: 'page', name: QUEST_TRACKER_pageName })[0];
				if (!pageObj) return;
				const pageId = pageObj.id;
				if (!QUEST_TRACKER_TreeObjRef[questId] || !QUEST_TRACKER_TreeObjRef[questId].text) return;
				const textObjId = QUEST_TRACKER_TreeObjRef[questId].text;
				const textObj = getObj('text', textObjId);				
				if (textObj) {
					const questData = QUEST_TRACKER_globalQuestData[questId];
					if (!questData) {
						errorCheck(152, 'msg', null,`Quest data for "${questId}" is missing.`);
						return;
					}
					const isHidden = questData.hidden || false;
					const textLayer = isHidden ? 'gmlayer' : 'objects';
					const x = textObj.get('left');
					const y = textObj.get('top');
					textObj.remove();
					D.drawText(pageId, x, y, questData.name, '#000000', textLayer, vars.TEXT_FONT_SIZE, 'Contrail One', questId);
				}
			}
		};
		const buildQuestTreeOnPage = (forcedRebuild = false) => {
			let questTreePage = findObjs({ _type: 'page', name: QUEST_TRACKER_pageName })[0];
			if (!questTreePage) {
				errorCheck(40, 'msg', null,`Page "${QUEST_TRACKER_pageName}" not found. Please create the page manually.`);
				return;
			}
			H.adjustPageSettings(questTreePage);
			H.clearPageObjects(questTreePage.id, () => {
				const questPositions = H.buildDAG(QUEST_TRACKER_globalQuestData, vars, forcedRebuild);
				H.adjustPageSizeToFitPositions(questTreePage, questPositions);
				H.buildPageHeader(questTreePage);
				QUEST_TRACKER_TreeObjRef = {};
				D.drawQuestConnections(questTreePage.id, questPositions);
				D.drawMutuallyExclusiveConnections(questTreePage.id, questPositions);
				D.drawQuestTreeFromPositions(questTreePage, questPositions, () => {
					D.drawQuestTextAfterGraphics(questTreePage, questPositions);
					saveQuestTrackerData();
				});
			});
		};
		const updateQuestText = (questId, newText) => {
			if (!QUEST_TRACKER_TreeObjRef[questId] || !QUEST_TRACKER_TreeObjRef[questId].text) return;
			const textObjId = QUEST_TRACKER_TreeObjRef[questId].text;
			const textObj = getObj('text', textObjId);
			if (!textObj) return;
			textObj.set('text', newText);
			saveQuestTrackerData();
		};
		const updateQuestTooltip = (questId, newTooltip) => {
			if (!QUEST_TRACKER_TreeObjRef[questId] || !QUEST_TRACKER_TreeObjRef[questId].avatar) return;
			const avatarObjId = QUEST_TRACKER_TreeObjRef[questId].avatar;
			const avatarObj = getObj('graphic', avatarObjId);
			if (!avatarObj) return;
			const trimmedTooltip = H.trimText(newTooltip, 150);
			avatarObj.set('tooltip', trimmedTooltip);
			saveQuestTrackerData();
		};
		const updateQuestStatusColor = (questId, statusNumber) => {
			if (!QUEST_TRACKER_TreeObjRef[questId] || !QUEST_TRACKER_TreeObjRef[questId].rectangle) return;
			const rectangleObjId = QUEST_TRACKER_TreeObjRef[questId].rectangle;
			const rectangleObj = getObj('path', rectangleObjId);
			if (!rectangleObj) return;
			const statusName = Statuses.getName(statusNumber);
			const statusColor = H.getStatusColor(statusName);
			rectangleObj.set('stroke', statusColor);
			D.redrawQuestText(questId);
			saveQuestTrackerData();
		};
		const updateQuestVisibility = (questId, makeHidden) => {
			if (!QUEST_TRACKER_TreeObjRef[questId]) return;
			const pageId = findObjs({ type: 'page', name: QUEST_TRACKER_pageName })[0].id;
			if (typeof makeHidden === 'string') makeHidden = makeHidden.toLowerCase() === 'true';
			const targetLayer = makeHidden ? 'gmlayer' : 'map';
			const avatarLayer = makeHidden ? 'gmlayer' : 'objects';
			const textLayer = makeHidden ? 'gmlayer' : 'objects';
			for (const sourceQuestId in QUEST_TRACKER_TreeObjRef) {
				const pathsToQuest = QUEST_TRACKER_TreeObjRef[sourceQuestId]?.paths?.[questId];
				if (pathsToQuest) {
					pathsToQuest.forEach(segmentId => {
						const pathObj = getObj('path', segmentId);
						if (pathObj) {
							pathObj.set({
								layer: targetLayer,
								stroke: makeHidden ? '#CCCCCC' : '#000000'
							});
						}
					});
				}
			}
			['rectangle', 'avatar', 'text'].forEach(element => {
				const objId = QUEST_TRACKER_TreeObjRef[questId][element];
				const obj = getObj(element === 'rectangle' ? 'path' : 'graphic', objId);
				if (obj) {
					const layer = element === 'avatar' ? avatarLayer : textLayer;
					obj.set('layer', layer);
				}
			});
			D.redrawQuestText(questId);
			if (!makeHidden) {
				saveQuestTrackerData();
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
	const Flags = (() => {
		const DEFAULT_FLAG_STATUSES = {
			1: { name: 'Unknown', color: '#A9A9A9' },
			2: { name: 'Available', color: '#32CD32' },
			3: { name: 'Unavailable', color: '#CCCCCC' },
			4: { name: 'Resolved', color: '#4682B4' }
		};
		const normalizeKey = (key) => Utils.sanitizeString((key || '').toLowerCase()).replace(/\s+/g, '_');
		const normalizeStatuses = (statuses = {}) => {
			const source = statuses && Object.keys(statuses).length ? statuses : DEFAULT_FLAG_STATUSES;
			return Object.entries(source).reduce((normalized, [id, status]) => {
				if (typeof status === 'string') {
					normalized[id] = {
						name: status,
						color: DEFAULT_FLAG_STATUSES[id]?.color || '#CCCCCC'
					};
				} else {
					normalized[id] = {
						name: status?.name || DEFAULT_FLAG_STATUSES[id]?.name || 'Unknown',
						color: status?.color || DEFAULT_FLAG_STATUSES[id]?.color || '#CCCCCC'
					};
				}
				return normalized;
			}, {});
		};
		const getStatuses = () => normalizeStatuses(QUEST_TRACKER_FlagStatuses);
		const getStatusName = (statusId) => {
			const statuses = getStatuses();
			if (statuses[statusId]) return statuses[statusId].name;
			const status = Object.values(statuses).find(definition => definition.name.toLowerCase() === `${statusId}`.toLowerCase());
			return status?.name || 'Unknown';
		};
		const getStatusColor = (statusIdOrName) => {
			const statuses = getStatuses();
			if (statuses[statusIdOrName]) return statuses[statusIdOrName].color;
			const status = Object.values(statuses).find(definition => definition.name === statusIdOrName);
			return status?.color || '#CCCCCC';
		};
		const buildStatusDropdown = () => Object.entries(getStatuses())
			.map(([id, status]) => `|${status.name},${id}`)
			.join('');
		const getNextStatusId = () => {
			const ids = Object.keys(getStatuses()).map(id => parseInt(id, 10)).filter(id => !isNaN(id));
			return `${ids.length ? Math.max(...ids) + 1 : 1}`;
		};
		const getStatusIdFromValue = (value) => {
			if (value === undefined || value === null || value === '') return null;
			const statuses = getStatuses();
			if (statuses[value]) return parseInt(value, 10);
			const match = Object.entries(statuses).find(([, status]) => status.name.toLowerCase() === `${value}`.toLowerCase());
			return match ? parseInt(match[0], 10) : null;
		};
		const isDefaultStatus = (id) => !!DEFAULT_FLAG_STATUSES[id];
		const migrateLoadedData = () => {
			let changed = false;
			if (!QUEST_TRACKER_Flags || typeof QUEST_TRACKER_Flags !== 'object' || Array.isArray(QUEST_TRACKER_Flags)) {
				QUEST_TRACKER_Flags = {};
				changed = true;
			}
			const normalizedStatuses = normalizeStatuses(QUEST_TRACKER_FlagStatuses);
			if (!state.QUEST_TRACKER.flagStatuses || state.QUEST_TRACKER.stateStatuses || state.QUEST_TRACKER.states || JSON.stringify(QUEST_TRACKER_FlagStatuses) !== JSON.stringify(normalizedStatuses)) {
				QUEST_TRACKER_FlagStatuses = normalizedStatuses;
				changed = true;
			}
			Object.keys(QUEST_TRACKER_Flags).forEach(key => {
				const flagData = QUEST_TRACKER_Flags[key] || {};
				const statusId = getStatusIdFromValue(flagData.status) || 1;
				if (`${flagData.status}` !== `${statusId}`) {
					flagData.status = statusId;
					changed = true;
				}
				if (!flagData.category) {
					flagData.category = 'general';
					changed = true;
				}
				if (flagData.description === undefined) {
					flagData.description = '';
					changed = true;
				}
			});
			if (changed) saveQuestTrackerData();
		};
		const addFlag = (name, value = 'false', category = 'general', status = 1) => {
			const key = normalizeKey(name);
			if (!key) return null;
			if (!QUEST_TRACKER_Flags[key]) {
				QUEST_TRACKER_Flags[key] = {
					name,
					value,
					category,
					status: getStatusIdFromValue(status) || 1,
					description: ''
				};
			}
			saveQuestTrackerData();
			QUEST_TRACKER_refreshLinkedQuestHandouts();
			return key;
		};
		const updateFlag = (key, field, value) => {
			key = normalizeKey(key);
			if (!QUEST_TRACKER_Flags[key]) return false;
			if (field === 'key') {
				const newKey = normalizeKey(value);
				if (!newKey || QUEST_TRACKER_Flags[newKey]) return false;
				QUEST_TRACKER_Flags[newKey] = QUEST_TRACKER_Flags[key];
				delete QUEST_TRACKER_Flags[key];
			} else if (field === 'status') {
				const statusId = getStatusIdFromValue(value);
				if (!statusId) return false;
				QUEST_TRACKER_Flags[key].status = statusId;
			} else if (['name', 'value', 'category', 'description'].includes(field)) {
				QUEST_TRACKER_Flags[key][field] = value;
			}
			saveQuestTrackerData();
			QUEST_TRACKER_refreshLinkedQuestHandouts();
			return true;
		};
		const removeFlag = (key) => {
			key = normalizeKey(key);
			if (!QUEST_TRACKER_Flags[key]) return false;
			delete QUEST_TRACKER_Flags[key];
			saveQuestTrackerData();
			QUEST_TRACKER_refreshLinkedQuestHandouts();
			return true;
		};
		const getFlag = (key) => QUEST_TRACKER_Flags[normalizeKey(key)] || null;
		const setFlagValue = (key, value) => updateFlag(key, 'value', value);
		const setFlagStatus = (key, status) => updateFlag(key, 'status', status);
		const addStatus = (name, color = '#CCCCCC') => {
			const id = getNextStatusId();
			QUEST_TRACKER_FlagStatuses[id] = { name, color };
			saveQuestTrackerData();
			QUEST_TRACKER_refreshLinkedQuestHandouts();
			return id;
		};
		const updateStatus = (id, field, value) => {
			if (!QUEST_TRACKER_FlagStatuses[id]) return false;
			if (field === 'name') QUEST_TRACKER_FlagStatuses[id].name = value;
			if (field === 'color') QUEST_TRACKER_FlagStatuses[id].color = value || '#CCCCCC';
			saveQuestTrackerData();
			QUEST_TRACKER_refreshLinkedQuestHandouts();
			return true;
		};
		const removeStatus = (id) => {
			if (!QUEST_TRACKER_FlagStatuses[id] || isDefaultStatus(id)) return false;
			delete QUEST_TRACKER_FlagStatuses[id];
			Object.values(QUEST_TRACKER_Flags).forEach(flagData => {
				if (`${flagData.status}` === `${id}`) flagData.status = 1;
			});
			saveQuestTrackerData();
			QUEST_TRACKER_refreshLinkedQuestHandouts();
			return true;
		};
		const resetStatuses = () => {
			QUEST_TRACKER_FlagStatuses = normalizeStatuses();
			Object.values(QUEST_TRACKER_Flags).forEach(flagData => {
				if (!QUEST_TRACKER_FlagStatuses[flagData.status]) flagData.status = 1;
			});
			saveQuestTrackerData();
			QUEST_TRACKER_refreshLinkedQuestHandouts();
		};
		return {
			normalizeStatuses,
			getStatuses,
			getStatusName,
			getStatusColor,
			buildStatusDropdown,
			getStatusIdFromValue,
			isDefaultStatus,
			migrateLoadedData,
			addFlag,
			updateFlag,
			removeFlag,
			getFlag,
			setFlagValue,
			setFlagStatus,
			addStatus,
			updateStatus,
			removeStatus,
			resetStatuses
		};
	})();
	const Rumours = (() => {
		const H = {
			getNewRumourId: () => {
				const existingRumourIds = [];
				Object.values(QUEST_TRACKER_globalRumours).forEach(quest => {
					Object.values(quest).forEach(status => {
						Object.values(status).forEach(location => {
							Object.keys(location).forEach(rumourId => {
								if (location[rumourId] && typeof location[rumourId] === "object") {
									const match = rumourId.match(/^rumour_(\d+)$/);
									if (match) {
										existingRumourIds.push(parseInt(match[1], 10));
									}
								}
							});
						});
					});
				});
				const highestRumourNumber = existingRumourIds.length > 0 ? Math.max(...existingRumourIds) : 0;
				return `rumour_${highestRumourNumber + 1}`;
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
				const locationObject = findObjs({ type: 'tableitem', rollabletableid: locationTable.id })
					.find(item => item.get('weight') == locationid);
				if (!locationObject) return;
				const cleanData = Utils.sanitizeString(locationObject.get('name')).toLowerCase();
				Object.entries(QUEST_TRACKER_globalRumours).forEach(([questId, questRumours]) => {
					Object.entries(questRumours).forEach(([status, statusRumours]) => {
						if (statusRumours[cleanData]) {
							Object.entries(statusRumours[cleanData]).forEach(([rumourKey, rumourData]) => {
								if (rumourData && typeof rumourData === "object") {
									delete statusRumours[cleanData][rumourKey];
								}
							});
							if (Object.keys(statusRumours[cleanData]).length === 0) {
								delete statusRumours[cleanData];
							}
						}
					});
				});
				Utils.updateHandoutField('rumour');
				calculateRumoursByLocation();
			},
			saveData: () => {
				saveQuestTrackerData();
				Utils.updateHandoutField('rumours');
			},
			findRumourLocation: (rumourId) => {
				const locationTable = findObjs({ type: 'rollabletable', name: QUEST_TRACKER_ROLLABLETABLE_LOCATIONS })[0];
				if (!locationTable) {
					log("Error: Locations table not found.");
					return null;
				}
				const locationItems = findObjs({ type: 'tableitem', rollabletableid: locationTable.id });
				let locationMapping = locationItems.reduce((acc, location) => {
					acc[Utils.sanitizeString(location.get('name').toLowerCase())] = location.get('weight');
					return acc;
				}, {});
				for (const [questId, questRumours] of Object.entries(QUEST_TRACKER_globalRumours)) {
					for (const [status, statusRumours] of Object.entries(questRumours)) {
						for (const [location, locationRumours] of Object.entries(statusRumours)) {
							if (locationRumours[rumourId]) {
								const locationId = locationMapping[location] || null;
								return {
									questId,
									status,
									locationId,
									once: locationRumours[rumourId].once || false
								};
							}
						}
					}
				}
				return null;
			}
		};
		const convertRumoursToNewFormat = () => {
			if (QUEST_TRACKER_versionChecking.RumourConversion) return;
			let rumoursConverted = false;
			for (const [questId, questData] of Object.entries(QUEST_TRACKER_globalRumours)) {
				for (const [status, locations] of Object.entries(questData)) {
					for (const [location, rumours] of Object.entries(locations)) {
						for (const [rumourId, rumourText] of Object.entries(rumours)) {
							QUEST_TRACKER_globalRumours[questId][status][location][rumourId] = {
								text: rumourText,
								type: "background",
								once: false
							};
							rumoursConverted = true;
						}
					}
				}
			}
			QUEST_TRACKER_versionChecking.RumourConversion = true;
			if (rumoursConverted) errorCheck(225, 'msg', null, `Rumours converted to new format (v1.2 update).`);
			H.saveData();
		};
		const calculateRumoursByLocation = () => {
			let rumoursByLocation = {};
			let questTable = findObjs({ type: 'rollabletable', name: QUEST_TRACKER_ROLLABLETABLE_QUESTS })[0];
			if (errorCheck(146, 'exists', questTable, `questTable`)) return;
			let questItems = findObjs({ type: 'tableitem', rollabletableid: questTable.id });
			if (errorCheck(147, 'exists', questItems, `questItems`)) return;
			Object.keys(QUEST_TRACKER_globalRumours).forEach(questId => {
				let relevantItem = questItems.find(item => item.get('name').toLowerCase() === questId.toLowerCase());
				if (errorCheck(148, 'exists', relevantItem, `relevantItem for questId: ${questId}`)) return;
				let relevantStatus = Statuses.getName(relevantItem.get('weight').toString()).toLowerCase();
				let questRumours = QUEST_TRACKER_globalRumours[questId] || {};
				if (questRumours[relevantStatus]) {
					Object.keys(questRumours[relevantStatus] || {}).forEach(location => {
						let locationRumours = questRumours[relevantStatus][location] || {};
						if (!rumoursByLocation[location]) rumoursByLocation[location] = {};
						Object.keys(locationRumours).forEach(rumourKey => {
							const rumourObject = locationRumours[rumourKey];
							if (rumourObject && typeof rumourObject === "object") {
								const rumourType = rumourObject.type || 'background';
								if (!rumoursByLocation[location][rumourType]) {
									rumoursByLocation[location][rumourType] = {};
								}
								rumoursByLocation[location][rumourType][rumourKey] = rumourObject.text;
							}
						});
					});
				}
			});
			QUEST_TRACKER_rumoursByLocation = rumoursByLocation;
			saveQuestTrackerData();
		};
		const sendRumours = (locationId, numberOfRumours) => {
			let locationTable = findObjs({ type: 'rollabletable', name: QUEST_TRACKER_ROLLABLETABLE_LOCATIONS })[0];
			if (errorCheck(41, 'exists', locationTable, `locationTable`)) return;
			let locationItems = findObjs({ type: 'tableitem', rollabletableid: locationTable.id });
			let location = locationItems.find(loc => loc.get('weight').toString() === locationId.toString());
			if (errorCheck(42, 'exists', location, `location`)) return;
			const normalizedLocationId = Utils.sanitizeString(location.get('name')).toLowerCase();
			const locationRumours = QUEST_TRACKER_rumoursByLocation[normalizedLocationId] || { background: {}, priority: {} };
			const everywhereRumours = QUEST_TRACKER_rumoursByLocation['everywhere'] || { background: {}, priority: {} };
			let priorityList = [
				...Object.entries(locationRumours.priority || {}),
				...Object.entries(everywhereRumours.priority || {})
			];
			let backgroundList = [
				...Object.entries(locationRumours.background || {}),
				...Object.entries(everywhereRumours.background || {})
			];
			let priorityCount = Math.min(Math.ceil(numberOfRumours / 2), priorityList.length);
			let backgroundCount = Math.min(numberOfRumours - priorityCount, backgroundList.length);
			if (priorityList.length < priorityCount) {
				backgroundCount = Math.min(numberOfRumours - priorityList.length, backgroundList.length);
				priorityCount = priorityList.length;
			}
			const shuffleArray = (array) => array.sort(() => Math.random() - 0.5);
			priorityList = shuffleArray(priorityList).slice(0, priorityCount);
			backgroundList = shuffleArray(backgroundList).slice(0, backgroundCount);
			const selectedRumours = [...priorityList, ...backgroundList];
			if (selectedRumours.length === 0) {
				Utils.sendGMMessage(`No rumours available for this location.`);
				return;
			}
			selectedRumours.forEach(([rumourId, rumourText]) => {
				Utils.sendDescMessage(rumourText);
				Triggers.checkTriggers('rumour', rumourId);
				const rumourDetails = H.findRumourLocation(rumourId);
				if (rumourDetails.once) {
					manageRumourObject({
						action: 'remove',
						questId: rumourDetails.questId,
						newItem: '',
						status: rumourDetails.status,
						location: parseInt(rumourDetails.locationId, 10),
						rumourId: rumourId
					});
				}
			});
		};
		const getLocationNameById = (locationId) => {
			const locationTable = findObjs({ type: 'rollabletable', name: QUEST_TRACKER_ROLLABLETABLE_LOCATIONS })[0];
			if (errorCheck(43, 'exists', locationTable,`locationTable`)) return null;
			const locationItems = findObjs({ type: 'tableitem', rollabletableid: locationTable.id });
			const locationItem = locationItems.find(item => item.get('weight').toString() === locationId.toString());
			if (errorCheck(44, 'exists', locationItem,`locationItem`)) return null;
			return locationItem.get('name');
		};
		const removeAllRumoursForQuest = (questId) => {
			if (!QUEST_TRACKER_globalRumours[questId]) return;
			Object.keys(QUEST_TRACKER_globalRumours[questId]).forEach(status => {
				const statusRumours = QUEST_TRACKER_globalRumours[questId][status] || {};
				Object.keys(statusRumours).forEach(location => {
					const locationRumours = statusRumours[location];
					if (locationRumours && typeof locationRumours === 'object') {
						Object.keys(locationRumours).forEach(rumourType => {
							if (locationRumours[rumourType] && typeof locationRumours[rumourType] === 'object') {
								Object.keys(locationRumours[rumourType]).forEach(rumourKey => {
									delete locationRumours[rumourType][rumourKey];
								});
							}
						});
					}
					if (Object.keys(locationRumours.background || {}).length === 0 &&
						Object.keys(locationRumours.priority || {}).length === 0) {
						delete statusRumours[location];
					}
				});
				if (Object.keys(statusRumours).length === 0) {
					delete QUEST_TRACKER_globalRumours[questId][status];
				}
			});
			if (Object.keys(QUEST_TRACKER_globalRumours[questId]).length === 0) {
				delete QUEST_TRACKER_globalRumours[questId];
			}
			Utils.updateHandoutField('rumour');
			calculateRumoursByLocation();
			QUEST_TRACKER_refreshLinkedQuestHandouts(questId);
		};
		const getAllLocations = () => {
			let rollableTable = findObjs({ type: 'rollabletable', name: QUEST_TRACKER_ROLLABLETABLE_LOCATIONS })[0];
			if (errorCheck(45, 'exists', rollableTable,`rollableTable`)) return [];
			const tableItems = findObjs({ _type: 'tableitem', _rollabletableid: rollableTable.id });
			const locations = tableItems.map(item => item.get('name'));
			return locations;
		};
		const manageRumourLocation = (action, newItem = null, locationid = null) => {
			const allLocations = Rumours.getAllLocations();
			let locationTable = findObjs({ type: 'rollabletable', name: QUEST_TRACKER_ROLLABLETABLE_LOCATIONS })[0];
			if (errorCheck(46, 'exists', locationTable,`locationTable`)) return;
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
		const manageRumourObject = ({ action, questId, newItem = '', status, location, rumourId = '', type = 'background' }) => {
			let locationString = getLocationNameById(location);
			const sanitizedLocation = locationString ? Utils.sanitizeString(locationString.toLowerCase()) : '';
			if (!QUEST_TRACKER_globalRumours[questId]) QUEST_TRACKER_globalRumours[questId] = {};
			if (!QUEST_TRACKER_globalRumours[questId][status]) QUEST_TRACKER_globalRumours[questId][status] = {};
			const questRumours = QUEST_TRACKER_globalRumours[questId];
			const statusRumours = questRumours[status];
			if (!statusRumours[sanitizedLocation]) {
				statusRumours[sanitizedLocation] = {};
			}
			switch (action) {
				case 'add': {
					const newRumourKey = rumourId === '' ? H.getNewRumourId() : rumourId;
					statusRumours[sanitizedLocation][newRumourKey] = {
						text: newItem,
						type: type,
						once: false
					};
					break;
				}
				case 'remove': {
					if (statusRumours[sanitizedLocation][rumourId]) {
						delete statusRumours[sanitizedLocation][rumourId];
						if (Object.keys(statusRumours[sanitizedLocation]).length === 0) {
							delete statusRumours[sanitizedLocation];
						}
					}
					break;
				}
				case 'changeType': {
					const rumourObj = statusRumours[sanitizedLocation][rumourId];
					if (rumourObj) {
						rumourObj.type = rumourObj.type === 'priority' ? 'background' : 'priority';
					}
					break;
				}
				case 'toggleOnce': {
					const rumourObj = statusRumours[sanitizedLocation][rumourId];
					if (rumourObj) {
						rumourObj.once = !rumourObj.once;
					}
					break;
				}
				default:
					break;
			}
			Utils.updateHandoutField('rumour');
			calculateRumoursByLocation();
		};
		return {
			calculateRumoursByLocation,
			sendRumours,
			manageRumourLocation,
			getLocationNameById,
			removeAllRumoursForQuest,
			getAllLocations,
			manageRumourObject,
			convertRumoursToNewFormat
		};
	})();
	const Menu = (() => {
		const styles = {
			menu: 'background-color: #fff; border: 1px solid #000; padding: 5px; border-radius: 5px; overflow: hidden;',
			button: 'margin-top: 1px; display: inline-block; background-color: #000; border: 1px solid #292929 ; border-radius: 3px; padding: 2px; color: #fff; text-align: center;',
			buttonDisabled: 'pointer-events: none; background-color: #666; border: 1px solid #292929; border-radius: 3px; padding: 2px; text-align: center; color: #000000;',
			spanInline: 'display: inline-block; margin-top: 1px;',
			smallButton: 'display: inline-block; width: 12px; height:16px;',
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
			strikethrough: 'text-decoration: line-through;',
			floatLeft: 'float: left;',
			floatRight: 'float: right;',
			floatClearRight: 'float: right; clear: right;',
			overflow: 'overflow: hidden; margin:1px',
			rumour: 'text-overflow: ellipsis;overflow: hidden;width: 100px;display: block;word-break: break-all;white-space: nowrap;',
			link: 'color: #007bff; text-decoration: underline; cursor: pointer;',
			questlink: 'color: #007bff; text-decoration: none; cursor: pointer; background-color: #FFFFFF;',
			filterlink: 'color: #007bff; text-decoration: none; cursor: pointer; background-color: #FFFFFF; padding:0px;',
			paddedfilterlink: 'color: #007bff; text-decoration: none; cursor: pointer; background-color: #FFFFFF; padding:5px;',
			treeStyle: 'display: inline-block; position: relative; text-align: center; margin-top: 0px;',
			questBox50: 'display: inline-block; width: 15px; height: 6px; padding: 5px; border: 1px solid #000; border-radius: 5px; background-color: #f5f5f5; text-align: center; position: relative; margin-right: 20px;',
			verticalLineStyle: 'position: absolute; width: 2px; background-color: black;',
			lineHorizontalRed: 'position: absolute; width: 24px; height: 2px; background-color: red; left: 57%;',
			lineHorizontal: 'position: absolute; height: 2px; background-color: black;',
			treeContainerStyle: 'position: relative; width: 100%; height: 100%; text-align: center; margin-top: 20px;',
			ulStyle: 'list-style: none; position: relative; padding: 0; margin: 0; display: block; text-align: center;',
			liStyle: 'display: inline-block; text-align: center; position: relative;',
			spanText: 'bottom: -1px; position: absolute; left: -1px; right: 0px;',
			centreImage: 'display: block; margin: auto; text-align: center;'
		};
		const H = {
			showActiveQuests: () => {
				let AQMenu = "";
				const activeStatuses = Statuses.getActiveIds();
				const activeQuests = QUEST_TRACKER_globalQuestArray
					.filter(quest => {
						const status = parseInt(Quest.getQuestStatus(quest.id), 10);
						return activeStatuses.includes(status);
					})
					.map(quest => quest.id);
				if (activeQuests.length === 0) {
					AQMenu += `<ul>
						<li style="${styles.overflow}">
							<span style="${styles.floatLeft}"><small>No Active Quests</small></span>
						</li>
					</ul>`;
				} else {
					AQMenu += `<ul style="${styles.list}">`;
					activeQuests.forEach(quest => {
						let questData = QUEST_TRACKER_globalQuestData[quest];
						AQMenu += `
						<li style="${styles.overflow}">
							<span style="${styles.floatLeft}"><small>${questData.name}</small></span>
							<span style="${styles.floatRight}">
								<a style="${styles.button}" href="!qt-menu action=quest|id=${quest}">Inspect</a>
							</span>
						</li>`;
					});
					AQMenu += `</ul>`;
				}
				return AQMenu;
			},
			showActiveRumours: () => {
				let menu = `<ul style="${styles.list}">`;
				let locationTable = findObjs({ type: 'rollabletable', name: QUEST_TRACKER_ROLLABLETABLE_LOCATIONS })[0];
				if (locationTable) {
					let locationItems = findObjs({ type: 'tableitem', rollabletableid: locationTable.id });
					locationItems.sort((a, b) => a.get('weight') - b.get('weight')).forEach(location => {
						let locationName = location.get('name');
						let locationKey = Utils.sanitizeString(locationName).toLowerCase();
						let locationWeight = location.get('weight');
						let locationRumours = QUEST_TRACKER_rumoursByLocation[locationKey] || {};
						let rumourCount = Object.keys(locationRumours).length;
						let everywhereRumours = QUEST_TRACKER_rumoursByLocation['everywhere'] || {};
						let everywhereRumourCount = Object.keys(everywhereRumours).length;
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
				menu += `</ul>`;
				return menu;
			},
			showTriggers: () => {
				let menu = `<ul style="${styles.list}">`;
				if (QUEST_TRACKER_Triggers.scripts) {
					Object.entries(QUEST_TRACKER_Triggers.scripts).forEach(([triggerId, trigger]) => {
						if (trigger.active && trigger.enabled) {
							menu += `
							<li style="${styles.column}">
								<span style="${styles.floatLeft}">
									${trigger.name || 'Unnamed Script Trigger'}
								</span>
								<span style="${styles.floatRight}">
									<a style="${styles.button}" href="!qt-trigger action=execute|triggerid=${triggerId}|menu=true">Run</a>
								</span>
							</li>`;
						}
					});
				}
				menu += `</ul>`;
				return menu;
			},
			getLinkedQuestHandout: (questId) => {
				const quest = QUEST_TRACKER_globalQuestData[questId];
				if (!quest?.handout) return null;
				return findObjs({ _type: 'handout', id: quest.handout })[0]
					|| findObjs({ type: 'handout', id: quest.handout })[0]
					|| null;
			},
			getLocationMapping: () => {
				const locationTable = findObjs({ type: 'rollabletable', name: QUEST_TRACKER_ROLLABLETABLE_LOCATIONS })[0];
				if (!locationTable) return [];
				return findObjs({ type: 'tableitem', rollabletableid: locationTable.id })
					.map(location => ({
						originalName: location.get('name'),
						sanitizedName: Utils.sanitizeString(location.get('name').toLowerCase()),
						weight: location.get('weight')
					}))
					.sort((a, b) => {
						if (a.sanitizedName === 'everywhere') return -1;
						if (b.sanitizedName === 'everywhere') return 1;
						return a.originalName.localeCompare(b.originalName);
					});
			},
			buildRumourLocationDropdown: () => {
				const locations = H.getLocationMapping();
				if (locations.length === 0) return '';
				if (locations.length === 1) return locations[0].weight;
				return `?{Location|${locations.map(location => `${Utils.roll20MacroSanitize(location.originalName)},${location.weight}`).join('|')}}`;
			},
			escapeMacroText: (text = '') => {
				return `${text}`.replace(/"/g, '&quot;').replace(/<br\s*\/?>/g, '%NEWLINE%').replace(/[\r\n]/g, '%NEWLINE%');
			},
			buildQuestDetailsHtml: (questId, options = {}) => {
				let quest = QUEST_TRACKER_globalQuestData[questId];
				if (!quest) return `<div style="${styles.menu}"><p>Error: Quest "${questId}" not found.</p></div>`;
				const { includeHandoutControl = true, includeNavigation = true, includeToken = true } = options;
				const normalizedQuest = Utils.normalizeKeys(quest);
				const statusName = Quest.getStatusNameByQuestId(questId, QUEST_TRACKER_globalQuestArray);
				const hiddenStatus = normalizedQuest.hidden ? 'Yes' : 'No';
				const disabledStatus = (normalizedQuest.disabled ?? false) ? 'Yes' : 'No';
				const questGroup = H.getQuestGroupNameByWeight(normalizedQuest.group);
				const hiddenStatusTorF = normalizedQuest.hidden ? 'true' : 'false';
				const hiddenStatusTorFReverse = normalizedQuest.hidden ? 'false' : 'true';
				const disabledStatusTorF = (normalizedQuest.disabled ?? false) ? 'true' : 'false';
				const disabledStatusTorFReverse = (normalizedQuest.disabled ?? false) ? 'false' : 'true';
				const validQuestGrouping = H.getValidQuestGroups(questId);
				const relationshipsHtml = displayQuestRelationships(questId);
				const relationshipMenuHtml = H.relationshipMenu(questId);
				return `
					<div style="${styles.menu}">
						<h3 style="margin-bottom: 10px;">${normalizedQuest.name || 'Unnamed Quest'}</h3>
						${includeToken ? H.displayQuestToken(questId) : ''}
						<p>${normalizedQuest.description || 'No description available.'}</p>
						<span style="${styles.floatRight}">
							<a style="${styles.button}" href="!qt-quest action=update|field=name|current=${questId}|old=${normalizedQuest.name || ''}|new=?{Title|${normalizedQuest.name || ''}}">Edit Title</a>
							&nbsp;
							<a style="${styles.button}" href="!qt-quest action=update|field=description|current=${questId}|old=${normalizedQuest.description || ''}|new=?{Description|${normalizedQuest.description || ''}}">Edit Description</a>
						</span>
						<br>
						${includeHandoutControl ? H.displayQuestHandout(questId) : ''}
						<br>
						<h4 style="${styles.bottomBorder} ${styles.topMargin}">Relationships</h4>
						${relationshipsHtml}
						${relationshipMenuHtml}
						<h4 style="${styles.bottomBorder} ${styles.topMargin}">Status</h4>
						<span>${statusName}</span>
						<span style="${styles.floatRight}">
							<a style="${styles.button}" href="!qt-quest action=update|field=status|current=${questId}|new=?{Change Status${Statuses.buildDropdown()}}">Change</a>
						</span>
						<h4 style="${styles.bottomBorder} ${styles.topMargin}">Hidden</h4>
						<span>${hiddenStatus}</span>
						<span style="${styles.floatRight}">
							<a style="${styles.button}" href="!qt-quest action=update|field=hidden|current=${questId}|old=${hiddenStatusTorF}|new=${hiddenStatusTorFReverse}">Change</a>
						</span>
						<h4 style="${styles.bottomBorder} ${styles.topMargin}">Disabled</h4>
						<span>${disabledStatus}</span>
						<span style="${styles.floatRight}">
							<a style="${styles.button}" href="!qt-quest action=update|field=disabled|current=${questId}|old=${disabledStatusTorF}|new=${disabledStatusTorFReverse}">Change</a>
						</span>
						<h4 style="${styles.bottomBorder} ${styles.topMargin}">Quest Group</h4>
						<span>${questGroup}</span>
						<span style="${styles.floatRight}">
							<a style="${styles.button}" href="!qt-quest action=update|field=group|current=${questId}|new=${validQuestGrouping}">Adjust</a>
						</span>
						${includeNavigation ? `<br><hr>
						<a style="${styles.button}" href="!qt-menu action=triggers">Triggers</a>
						&nbsp;<a style="${styles.button}" href="!qt-menu action=allquests">All Quests</a>
						&nbsp;<a style="${styles.button}" href="!qt-menu action=main">Main Menu</a>` : ''}
					</div>`;
			},
			buildQuestRumoursHtml: (questId) => {
				const questRumours = QUEST_TRACKER_globalRumours[questId] || {};
				const locations = H.getLocationMapping();
				const locationDropdown = H.buildRumourLocationDropdown();
				let html = `<div style="${styles.menu}"><h3>Rumours</h3>`;
				if (locations.length === 0) {
					html += `<p>No rumour locations are available.</p></div>`;
					return html;
				}
				Object.entries(Statuses.getAll()).forEach(([statusId, status]) => {
					const statusKey = status.name.toLowerCase();
					const rumoursByLocation = questRumours[statusKey] || {};
					const rumourCount = Object.values(rumoursByLocation).reduce((sum, locationRumours) => sum + Object.keys(locationRumours || {}).length, 0);
					html += `<h4 style="${styles.bottomBorder}">${status.name} <small>${rumourCount} rumour${rumourCount === 1 ? '' : 's'}</small></h4>`;
					html += `<table style="width:100%;">`;
					if (rumourCount === 0) {
						html += `<tr><td colspan="7"><small>No rumours</small></td></tr>`;
					}
					locations.forEach(location => {
						const locationRumours = rumoursByLocation[location.sanitizedName] || {};
						Object.entries(locationRumours).forEach(([rumourId, rumourData]) => {
							const cleanRumour = rumourId.replace(/^rumour_(\d+)$/, 'Rumour #$1');
							const rumourText = H.escapeMacroText(rumourData.text || '');
							const rumourType = rumourData.type || 'background';
							html += `
								<tr>
									<td><small>${location.originalName}</small></td>
									<td><small>${cleanRumour}</small></td>
									<td><small>${(rumourData.text || '').replace(/%NEWLINE%|<br>/g, ' | ')}</small></td>
									<td style="${styles.smallButtonContainer}">
										<a style="${styles.button} ${styles.smallButton}" href="!qt-rumours action=update|questid=${questId}|status=${statusKey}|location=${location.weight}|rumourid=${rumourId}|new=?{Update Rumour|${rumourText}}">c</a>
									</td>
									<td style="${styles.smallButtonContainer}">
										<a style="${styles.button} ${styles.smallButton}" href="!qt-rumours action=remove|questid=${questId}|status=${statusKey}|location=${location.weight}|rumourid=${rumourId}">-</a>
									</td>
									<td style="${styles.smallButtonContainer}">
										<a style="${styles.button} ${styles.smallButton}" href="!qt-rumours action=changeType|questid=${questId}|status=${statusKey}|location=${location.weight}|rumourid=${rumourId}">${rumourType === 'priority' ? 'p' : 'b'}</a>
									</td>
									<td style="${styles.smallButtonContainer}">
										<a style="${styles.button} ${styles.smallButton}" href="!qt-rumours action=toggleOnce|questid=${questId}|status=${statusKey}|location=${location.weight}|rumourid=${rumourId}">${rumourData.once ? '1' : 'many'}</a>
									</td>
									<td style="${styles.smallButtonContainer}">
										<a style="${styles.button} ${styles.smallButton}" href="!qt-trigger action=addrumour|rumourid=${rumourId}">T</a>
									</td>
								</tr>`;
						});
					});
					html += `
						<tr style="${styles.topBorder}">
							<td colspan="7"><small>Add Rumour</small></td>
							<td style="${styles.smallButtonContainer}">
								<a style="${styles.button} ${styles.smallButton}" href="!qt-rumours action=add|questid=${questId}|status=${statusKey}|location=${locationDropdown}|new=?{Enter New Rumour}">+</a>
							</td>
						</tr>
					</table>`;
				});
				html += `</div>`;
				return html;
			},
			getQuestRumourIds: (questId) => {
				const rumourIds = new Set();
				Object.values(QUEST_TRACKER_globalRumours[questId] || {}).forEach(statusRumours => {
					Object.values(statusRumours || {}).forEach(locationRumours => {
						Object.keys(locationRumours || {}).forEach(rumourId => rumourIds.add(rumourId));
					});
				});
				return rumourIds;
			},
			effectReferencesQuest: (effect, questId) => {
				return (effect?.effecttype || 'quest') === 'quest' && effect.id === questId;
			},
			triggerReferencesQuest: (trigger, questId) => {
				return Object.values(trigger.effects || {}).some(effect => H.effectReferencesQuest(effect, questId))
					|| Object.values(trigger.failEffects || {}).some(effect => H.effectReferencesQuest(effect, questId));
			},
			collectQuestTriggers: (questId) => {
				const rumourIds = H.getQuestRumourIds(questId);
				const triggers = new Map();
				const addTriggerEntry = (triggerId, trigger, type, parentId, reason) => {
					if (!trigger) return;
					const existing = triggers.get(triggerId);
					if (existing) {
						if (!existing.reasons.includes(reason)) existing.reasons.push(reason);
						return;
					}
					triggers.set(triggerId, { triggerId, trigger, type, parentId, reasons: [reason] });
				};
				Object.entries(QUEST_TRACKER_Triggers.quests || {}).forEach(([parentId, triggerGroup]) => {
					Object.entries(triggerGroup || {}).forEach(([triggerId, trigger]) => {
						if (parentId === questId) addTriggerEntry(triggerId, trigger, 'quest', parentId, 'Quest trigger');
						else if (H.triggerReferencesQuest(trigger, questId)) addTriggerEntry(triggerId, trigger, 'quest', parentId, 'Quest effect');
					});
				});
				Object.entries(QUEST_TRACKER_Triggers.rumours || {}).forEach(([parentId, triggerGroup]) => {
					Object.entries(triggerGroup || {}).forEach(([triggerId, trigger]) => {
						if (rumourIds.has(parentId)) addTriggerEntry(triggerId, trigger, 'rumour', parentId, 'Rumour trigger');
						else if (H.triggerReferencesQuest(trigger, questId)) addTriggerEntry(triggerId, trigger, 'rumour', parentId, 'Quest effect');
					});
				});
				['dates', 'reactions', 'events'].forEach(category => {
					Object.entries(QUEST_TRACKER_Triggers[category] || {}).forEach(([parentId, triggerGroup]) => {
						Object.entries(triggerGroup || {}).forEach(([triggerId, trigger]) => {
							if (H.triggerReferencesQuest(trigger, questId)) addTriggerEntry(triggerId, trigger, category.replace(/s$/, ''), parentId, 'Quest effect');
						});
					});
				});
				Object.entries(QUEST_TRACKER_Triggers.scripts || {}).forEach(([triggerId, trigger]) => {
					if (H.triggerReferencesQuest(trigger, questId)) addTriggerEntry(triggerId, trigger, 'script', 'script', 'Quest effect');
				});
				return Array.from(triggers.values()).sort((a, b) => (a.trigger.name || '').localeCompare(b.trigger.name || ''));
			},
			renderTriggerConditions: (triggerId, trigger) => {
				const flagDropdown = H.buildFlagDropdownString();
				let html = `<table style="width:100%;">`;
				if (Array.isArray(trigger.conditions) && trigger.conditions.length > 0) {
					trigger.conditions.forEach(condition => {
						if (condition?.type !== 'flag') return;
						html += `
							<tr>
								<td>${H.getFlagRequirementLabel(condition)}</td>
								<td style="${styles.smallButtonContainer}">
									<a style="${styles.button} ${styles.smallButton}" href="!qt-trigger action=updatecondition|triggerid=${triggerId}|oldflag=${condition.key}|oldstatus=${condition.status}|flag=${flagDropdown || condition.key}|status=?{Flag Status${Flags.buildStatusDropdown()}}">c</a>
								</td>
								<td style="${styles.smallButtonContainer}">
									<a style="${styles.button} ${styles.smallButton}" href="!qt-trigger action=removecondition|triggerid=${triggerId}|flag=${condition.key}|status=${condition.status}">-</a>
								</td>
							</tr>`;
					});
				} else {
					html += `<tr><td colspan="3"><small>No flag conditions</small></td></tr>`;
				}
				html += `<tr><td colspan="2"><small>Add Flag Condition</small></td><td style="${styles.smallButtonContainer}">${flagDropdown ? `<a style="${styles.button} ${styles.smallButton}" href="!qt-trigger action=addcondition|triggerid=${triggerId}|flag=${flagDropdown}|status=?{Flag Status${Flags.buildStatusDropdown()}}">+</a>` : `<span style="${styles.buttonDisabled} ${styles.smallButton}">+</span>`}</td></tr></table>`;
				return html;
			},
			buildQuestTriggersHtml: (questId) => {
				const triggerEntries = H.collectQuestTriggers(questId);
				let html = `<div style="${styles.menu}"><h3>Triggers</h3>
					<a style="${styles.button}" href="!qt-trigger action=addquest|questid=${questId}">Add Quest Trigger</a>`;
				if (triggerEntries.length === 0) {
					html += `<p>No relevant triggers.</p></div>`;
					return html;
				}
				triggerEntries.forEach(({ triggerId, trigger, type, parentId, reasons }) => {
					const enabled = !!trigger.enabled;
					const active = type === 'script' ? !!trigger.active : null;
					const actionType = trigger.action?.type || null;
					const actionEffect = trigger.action?.effect || null;
					html += `
						<hr>
						<h4>${trigger.name || 'Unnamed Trigger'}</h4>
						<table style="width:100%;">
							<tr><td>Type</td><td>${type}</td></tr>
							<tr><td>Parent</td><td>${parentId}</td></tr>
							<tr><td>Relevant Because</td><td>${reasons.join(', ')}</td></tr>
							<tr><td>Enabled</td><td><a style="${styles.button}" href="!qt-trigger action=toggle|triggerid=${triggerId}|field=enabled|value=${enabled ? 'false' : 'true'}">${enabled ? 'Enabled' : 'Disabled'}</a></td></tr>
							${type === 'script' ? `<tr><td>Active</td><td><a style="${styles.button}" href="!qt-trigger action=toggle|triggerid=${triggerId}|field=active|value=${active ? 'false' : 'true'}">${active ? 'Active' : 'Inactive'}</a></td></tr>` : ''}
							${type === 'quest' ? `<tr><td>Quest Action</td><td>
								<a style="${styles.button}" href="!qt-trigger action=action|triggerid=${triggerId}|type=?{Choose Type|Status Change,status|Toggle: Visibility,hidden|Toggle: State,disabled}">${actionType || 'Choose Type'}</a>
								${actionType ? `<a style="${styles.button}" href="!qt-trigger action=effect|triggerid=${triggerId}|type=${H.effectDropdown(actionType)}">${actionType === 'status' ? Statuses.getName(actionEffect) : (actionEffect || 'Choose')}</a>` : ''}
							</td></tr>` : ''}
							<tr><td colspan="2">
								<a style="${styles.button}" href="!qt-menu action=showTriggerDetails|id=${triggerId}">Inspect</a>
								<a style="${styles.button}" href="!qt-trigger action=delete|triggerid=${triggerId}">Delete</a>
							</td></tr>
						</table>
						<h5>Conditions</h5>
						${H.renderTriggerConditions(triggerId, trigger)}
						<h5>Effects</h5>
						${H.renderTriggerEffects(triggerId, trigger.effects, 'effects')}
						<h5>Fail Effects</h5>
						${H.renderTriggerEffects(triggerId, trigger.failEffects, 'failEffects')}`;
				});
				html += `</div>`;
				return html;
			},
			buildLinkedQuestHandoutHtml: (questId) => {
				const quest = QUEST_TRACKER_globalQuestData[questId];
				if (!quest) return `<div style="${styles.menu}"><p>Quest not found.</p></div>`;
				return `
					${H.buildQuestDetailsHtml(questId, { includeHandoutControl: false, includeNavigation: false, includeToken: false })}
					<br>
					${H.buildQuestRumoursHtml(questId)}
					<br>
					${H.buildQuestTriggersHtml(questId)}
					<br>
					<div style="${styles.menu}">
						<a style="${styles.button}" href="!qt-menu action=quest|id=${questId}">Refresh Quest Handout</a>
						&nbsp;<a style="${styles.button}" href="!qt-menu action=allquests">All Quests</a>
						&nbsp;<a style="${styles.button}" href="!qt-menu action=main">Main Menu</a>
					</div>
				`.replace(/[\r\n]/g, '');
			},
			updateLinkedQuestHandout: (questId) => {
				const handout = H.getLinkedQuestHandout(questId);
				if (!handout) return false;
				const html = H.buildLinkedQuestHandoutHtml(questId);
				handout.set('gmnotes', html);
				return true;
			},
			updateAllLinkedQuestHandouts: () => {
				Object.keys(QUEST_TRACKER_globalQuestData).forEach(questId => H.updateLinkedQuestHandout(questId));
			},
			isFlagCondition: (condition) => {
				return typeof condition === 'object' && condition !== null && condition.type === 'flag' && condition.key;
			},
			getFlagRequirementLabel: (condition) => {
				const flag = Flags.getFlag(condition.key);
				const flagName = flag?.name || condition.key;
				const requiredStatus = Flags.getStatusName(condition.status);
				const currentStatus = flag ? Flags.getStatusName(flag.status) : 'Missing Flag';
				return `${flagName} = ${requiredStatus} <small>(current: ${currentStatus})</small>`;
			},
			buildFlagDropdownString: () => {
				const flags = Object.entries(QUEST_TRACKER_Flags)
					.map(([key, flag]) => ({
						key,
						name: Utils.roll20MacroSanitize(flag.name || key)
					}))
					.sort((a, b) => a.name.localeCompare(b.name));
				if (flags.length === 0) return '';
				if (flags.length === 1) return flags[0].key;
				return `?{Choose Flag|${flags.map(flag => `${flag.name},${flag.key}`).join('|')}}`;
			},
			buildFlagRequirementLink: (questId, groupnum = null) => {
				const flagDropdown = H.buildFlagDropdownString();
				if (!flagDropdown) {
					return `<span style="${styles.buttonDisabled} ${styles.smallButton}">+</span>`;
				}
				const groupPart = groupnum === null ? '' : `|groupnum=${groupnum}`;
				return `<a href="!qt-questrelationship currentquest=${questId}|action=add|type=flag${groupPart}|flag=${flagDropdown}|status=?{Flag Status${Flags.buildStatusDropdown()}}" style="${styles.button} ${styles.smallButton}">+</a>`;
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
				let spanOrAnchor = `${H.buildDropdownString(questId) === '' ? 'span' : 'a'}`;
				let renderButtonStyle = `${H.buildDropdownString(questId) === '' ? styles.buttonDisabled : styles.button}`;
				groupnum += H.calculateStartingGroupNum(conditions, isInLogicGroup);
				return conditions.map((condition, index) => {
					const currentGroupNum = H.calculateGroupNum(condition, conditions, groupnum);
					const displayIndex = index + 1;
					const isLastCondition = displayIndex === conditions.length;
					const isLastnonGroupCondition = (index + 1 < conditions.length && typeof conditions[index + 1] === 'object') || index === conditions.length - 1;
					const isOnlyGroupCondition = conditions.length === 1 && typeof conditions[0] === 'object';
					const addFlagRequirementRow = !indent && isLastnonGroupCondition ? `
							<tr>
								<td colspan="3">
									<small>Add Flag Requirement</small>
								</td>
								<td style="${styles.smallButtonContainer}">
									${H.buildFlagRequirementLink(questId)}
								</td>
							</tr>
						` : '';
					if (typeof condition === 'string') {
						return `
							<tr>
								${indent ? `<td>&nbsp;</td><td>` : `<td colspan="2">`}
									<a style="${styles.questlink}" href="!qt-menu action=quest|id=${condition}">${H.getQuestName(condition)}</a>
								</td>
								<td style="${styles.smallButtonContainer}">
									<a style="${styles.button} ${styles.smallButton}" href="!qt-questrelationship currentquest=${questId}|oldquest=${condition}|action=update|type=${indent ? `group|groupnum=${currentGroupNum}` : `single`}|quest=${H.buildDropdownString(questId, condition)}">c</a>
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
									<${spanOrAnchor} href="!qt-questrelationship currentquest=${questId}|action=add|type=group|groupnum=${currentGroupNum}|quest=${H.buildDropdownString(questId)}" style="${renderButtonStyle} ${styles.smallButton}">+</a>
								</td>
							</tr>
							` : ''}
							${!indent && isLastnonGroupCondition ? `
							<tr>
								<td colspan="3">
									<small>Add Relationship</small>
								</td>
								<td style="${styles.smallButtonContainer}">
									<${spanOrAnchor} href="!qt-questrelationship currentquest=${questId}|action=add|type=single|quest=${H.buildDropdownString(questId)}" style="${renderButtonStyle} ${styles.smallButton}">+</a>
								</td>
							</tr>
							` : ''}
							${addFlagRequirementRow}
						`;
					} else if (H.isFlagCondition(condition)) {
						return `
							<tr>
								${indent ? `<td>&nbsp;</td><td>` : `<td colspan="2">`}
									${H.getFlagRequirementLabel(condition)}
								</td>
								<td style="${styles.smallButtonContainer}">
									<a style="${styles.button} ${styles.smallButton}" href="!qt-questrelationship currentquest=${questId}|action=update|type=flag|oldflag=${condition.key}|oldstatus=${condition.status}|flag=${H.buildFlagDropdownString() || condition.key}|status=?{Flag Status${Flags.buildStatusDropdown()}}${indent ? `|groupnum=${currentGroupNum}` : ''}">c</a>
								</td>
								<td style="${styles.smallButtonContainer}">
									<a style="${styles.button} ${styles.smallButton}" href="!qt-questrelationship currentquest=${questId}|action=remove|type=flag|flag=${condition.key}|status=${condition.status}${indent ? `|groupnum=${currentGroupNum}` : ''}|confirmation=DELETE">-</a>
								</td>
							</tr>
							${addFlagRequirementRow}
						`;
					} else if (typeof condition === 'object' && condition.logic && Array.isArray(condition.conditions)) {
						const subLogic = H.formatConditions(questId, condition.conditions, condition.logic, true, currentGroupNum, true);
						const reverseLogic = condition.logic === 'AND' ? 'OR' : 'AND';
						let addRelasionshipRow = ''
						if (currentGroupNum === 0) {
							addRelasionshipRow += `
								<tr style="${styles.topBorder}">
									<td colspan="3" style="${styles.topBorder}">
										<small>Add Relationship</small>
									</td>
									<td style="${styles.smallButtonContainer}">
										<${spanOrAnchor} href="!qt-questrelationship currentquest=${questId}|action=add|type=single|quest=${H.buildDropdownString(questId)}" style="${renderButtonStyle} ${styles.smallButton}">+</a>
									</td>
								</tr>`;
						}
						return `
							${addRelasionshipRow}
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
				if (!Quest.getValidQuestsForDropdown(questId)) return '';
				else {
					const validQuests = Quest.getValidQuestsForDropdown(questId);
					if (validQuests.length === 1) return validQuests[0];
					validQuests.sort((a, b) => H.getQuestName(a).localeCompare(H.getQuestName(b)));
					const dropdownString = validQuests.map(questId => {
						return `${H.getQuestName(questId)},${questId}`;
					}).join('|');
					return `?{Choose Quest|${dropdownString}}`;
				}
			},
			getQuestName: (questId) => {
				return QUEST_TRACKER_globalQuestData[questId]?.name.replace(/[{}|&?]/g, '') || 'Unnamed Quest';
			},
			getEventName: (eventId) => {
				return QUEST_TRACKER_Events[eventId]?.name.replace(/[{}|&?]/g, '') || 'Unnamed Event';
			},
			relationshipMenu: (questId) => {
				const quest = QUEST_TRACKER_globalQuestData[questId];
				let htmlOutput = "";
				let spanOrAnchor = `${H.buildDropdownString(questId) === '' ? 'span' : 'a'}`;
				let renderButtonStyle = `${H.buildDropdownString(questId) === '' ? styles.buttonDisabled : styles.button}`;
				if (!quest || !quest.relationships || !Array.isArray(quest.relationships.conditions) || quest.relationships.conditions.length === 0) {
					htmlOutput += `<br><table style="width:100%;">
										<tr style="${styles.topBorder}">
											<td colspan="3" style="${styles.topBorder}">
												<small>Add Relationship</small>
											</td>
											<td style="${styles.smallButtonContainer}">
												<${spanOrAnchor} href="!qt-questrelationship currentquest=${questId}|action=add|type=single|quest=${H.buildDropdownString(questId)}" style="${renderButtonStyle} ${styles.smallButton}">+</a>
											</td>
										</tr>
										<tr>
											<td colspan="3">
												<small>Add Flag Requirement</small>
											</td>
											<td style="${styles.smallButtonContainer}">
												${H.buildFlagRequirementLink(questId)}
											</td>
										</tr>
										<tr style="${styles.bottomBorder}">
											<td colspan="3"><small>Add Relationship Group</small></td>
											<td style="${styles.smallButtonContainer}">
												<${spanOrAnchor} href="!qt-questrelationship currentquest=${questId}|action=add|type=addgroup|quest=${H.buildDropdownString(questId)}" style="${renderButtonStyle} ${styles.smallButton}">+</a>
											</td>
										</tr>
									</table>`;
				} else {
					const conditionsHtml = H.formatConditions(questId, quest.relationships.conditions, quest.relationships.logic || 'AND');
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
									<${spanOrAnchor} href="!qt-questrelationship currentquest=${questId}|action=add|type=addgroup|quest=${H.buildDropdownString(questId)}" style="${renderButtonStyle} ${styles.smallButton}">+</a>
								</td>
							</tr>
						</table>`;
				}
				let mutuallyExclusiveHtml = "";
				if (Array.isArray(quest.relationships.mutually_exclusive) && quest.relationships.mutually_exclusive.length > 0) {
					mutuallyExclusiveHtml += quest.relationships.mutually_exclusive.map(exclusive => `
						<tr>
							<td colspan="2">
								<a style="${styles.questlink}" href="!qt-menu action=quest|id=${exclusive}">${H.getQuestName(exclusive)}</a>
							</td>
							<td style="${styles.smallButtonContainer}">
								<a href="!qt-questrelationship currentquest=${questId}|action=update|type=mutuallyexclusive|oldquest=${exclusive}|quest=${H.buildDropdownString(questId)}" style="${styles.button} ${styles.smallButton}">c</a>
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
								<${spanOrAnchor} href="!qt-questrelationship currentquest=${questId}|action=add|type=mutuallyexclusive|quest=${H.buildDropdownString(questId)}" style="${renderButtonStyle} ${styles.smallButton}">+</a>
							</td>
						</tr>
					</table>`;
				return htmlOutput;
			},
			getValidQuestGroups: (questId) => {
				let result = '';
				const quest = QUEST_TRACKER_globalQuestData[questId];
				const questGroupsTable = findObjs({ type: 'rollabletable', name: QUEST_TRACKER_ROLLABLETABLE_QUESTGROUPS })[0];
				if (!questGroupsTable) return result;
				const questGroups = findObjs({ type: 'tableitem', rollabletableid: questGroupsTable.id });
				if (quest && quest.group) {
					if (questGroups.length === 1) {
						return "remove";
					}
					else {
						result += 'Remove from Group,remove|';
					}
				}
				result += questGroups
					.filter(group => parseInt(quest.group) !== parseInt(group.get('weight')))
					.map(group => `${group.get('name')},${group.get('weight')}`)
					.join('|');
				if (result.includes('|')) return "?{Change Quest Grouping|" + result + "}";
				else {
					const [f,s] = result.split(',');
					return s;
				}
			},
			getQuestGroupNameByWeight: (weight) => {
				if (!weight) return 'No Assigned Group';
				let groupTable = findObjs({ type: 'rollabletable', name: QUEST_TRACKER_ROLLABLETABLE_QUESTGROUPS })[0];
				if (!groupTable) {
					Utils.sendGMMessage('Error: Quest Groups table not found. Please check if the table exists in the game.');
					return null;
				}
				let groupItems = findObjs({ type: 'tableitem', rollabletableid: groupTable.id });
				let group = groupItems.find(item => item.get('weight') == weight);
				return group.get('name');
			},
			showUpcomingEvents: () => {
				const upcomingEvents = Calendar.getNextEvents(5);
				let menu = "";
				if (upcomingEvents.length === 0) {
					menu += `<ul>
						<li style="${styles.overflow}">
							<span style="${styles.floatLeft}">
								<small>No Upcoming Events</small>
							</span>
						</li>
					</ul>`;
				} else {
					menu += `<ul style="${styles.list}">`;
					upcomingEvents.forEach((event, index) => {
						const [date, name] = event;
						const eventId = `event-${index}`;
						menu += `<li style="${styles.overflow}">
							<span style="${styles.floatLeft}">
								${name}
								<br>
								<small>${date}</small>
							</span>`;
						if (index === 0) {
							menu += `
							<span style="${styles.floatRight}">
								<a style="${styles.button}" href="!qt-date action=modify|home=true|unit=event|new=1">Advance</a>
							</span>`;
						}
						menu += `</li>`;
					});
					menu += `</ul>`;
				}

				return menu;
			},
			buildFrequencyDropdown: () => {
				const dropdownString = Object.entries(frequencyMapping)
					.map(([key, value]) => `|${value},${key}`)
					.join('');
				return dropdownString;
			},
			buildLocationDropdown: () => {
				const dropdownString = Object.entries(WEATHER.enviroments)
					.map(([key, value]) => `|${value.name},${key}`)
					.join('');
				return dropdownString;
			},
			returnCurrentLocation: (key) => {
				const { WEATHER } = getCalendarAndWeatherData();
				if (WEATHER.enviroments && WEATHER.enviroments[key]) return WEATHER.enviroments[key].name;
				else return "Unknown Location";
			},
			buildCalenderDropdown: () => {
				const dropdownString = Object.entries(CALENDARS)
					.map(([key, value]) => `|${value.name},${key}`)
					.join('');
				return dropdownString;
			},
			buildClimateDropdown: () => {
				const currentCalendar = CALENDARS[QUEST_TRACKER_calenderType];
				const dropdownString = Object.keys(currentCalendar.climates)
					.map((climate) => `|${climate.charAt(0).toUpperCase() + climate.slice(1)},${climate}`)
					.join("");
				return dropdownString;
			},
			hasMultipleMoons: (l) => {
				if (Object.keys(l).length > 1) return true;
				else return false;
			},
			lunarPhases: () => {
				const calendar = CALENDARS[QUEST_TRACKER_calenderType];
				if (errorCheck(155, 'exists', calendar.lunarCycle, `calendar.lunarCycle`)) return;
				const currentDate = QUEST_TRACKER_currentDate;
				let output = `<tr><td colspan=2><strong>Lunar Phase${H.hasMultipleMoons(calendar.lunarCycle) ? 's' : ''}</strong></td></tr>`;
				for (const moonId in calendar.lunarCycle) {
					if (calendar.lunarCycle.hasOwnProperty(moonId)) {
						const phase = Calendar.getLunarPhase(currentDate, moonId);
						output += `<tr><td colspan=2><small>${phase}</small></td></tr>`;
					}
				}
				return output;
			},
			displayQuestToken: (questId) => {
				let quest = QUEST_TRACKER_globalQuestData[questId];
				if (errorCheck(158, 'exists', quest, `quest`)) return;
				const questTable = findObjs({ type: 'rollabletable', name: QUEST_TRACKER_ROLLABLETABLE_QUESTS })[0];
				if (errorCheck(156, 'exists', questTable, `questTable`)) return;
				const questTableItems = findObjs({ type: 'tableitem', rollabletableid: questTable.id });
				const questTableItem = questTableItems.find(item => item.get('name').toLowerCase() === questId.toLowerCase());
				if (errorCheck(157, 'exists', questTableItem, `questTableItem`)) return;
				let imgsrc = questTableItem.get('avatar');
				if (!imgsrc) imgsrc = QUEST_TRACKER_BASE_QUEST_ICON_URL;
				const strippedimgsrc = imgsrc.split('?')[0];
				if (strippedimgsrc) return `<span style="${styles.centreImage}">[${quest.name}](${strippedimgsrc})</span>`;
				else return "";
			},
			displayQuestHandout: (questId) => {
				let quest = QUEST_TRACKER_globalQuestData[questId];
				if (errorCheck(159, 'exists', quest, `quest`)) return;
				let html = `<h4 style="${styles.bottomBorder} ${styles.topMargin}">Linked Handout</h4>`;
				let linkHandoutURL = `!qt-quest action=linkhandout|current=${questId}|key=?{How to Link|Auto Link,AUTO|Manual Link,?{Key&#125;`;
				if (!quest.handout) {
					html += `
					<span style="${styles.floatRight}">
						<a style="${styles.button}" href="${linkHandoutURL}">Link</a>
					</span>`;
				}
				else {
					const handout = findObjs({ _type: 'handout', id: quest.handout })[0];
					let handoutName = "<small>Error: Fix Handout Link</small>";
					let err = true;
					if (!errorCheck(160, 'exists', handout, `handout`)) {
						err = false;
						handoutName = handout.get('name');
					}
					let openHTML = err ? `` : `<a style="${styles.button}" href="http://journal.roll20.net/handout/${quest.handout}">Open</a> `;
					html += `<span>${handoutName}</span>
					<span style="${styles.floatRight}">
						${openHTML}<a style="${styles.button}" href="${linkHandoutURL}">${err ? 'Fix' : 'Change'}</a> <a style="${styles.button}" href="!qt-quest action=removehandout|current=${questId}">-</a>
					</span>`;
				}
				return html;
			},
			applyFilter: (filter, questData) => {
				if (!filter || Object.keys(filter).length === 0) return true;
				if (!questData) return false;

				return Object.entries(filter).every(([key, value]) => {
					if (key === 'group') {
						if (value === undefined || (Array.isArray(value) && value.length === 0)) return true;
						if (Array.isArray(value)) return value.map(String).includes(String(questData.group));
						return false;
					} else if (['handout', 'disabled', 'hidden'].includes(key)) {
						if (value === undefined) return true;
						if (value === true) return !!questData[key];
						if (value === false) return !questData[key];
					} else if (Array.isArray(value)) {
						return value.includes(questData[key]);
					} else if (typeof value === 'boolean') {
						return questData[key] === value;
					} else {
						return `${questData[key]}` === `${value}`;
					}
				});
			},
			renderQuestList: (quests, groupBy, type = 'quest') => {
				let menu = '';
				const groupedQuests = groupBy
					? quests.reduce((acc, quest) => {
						let groupKey;
						if (groupBy === 'handout') {
							groupKey = quest.handout ? 'Linked Handout' : 'No Handout Linked';
						} else if (groupBy === 'disabled') {
							groupKey = quest.disabled === true || quest.disabled === 'true' ? 'Disabled' : 'Enabled';
						} else if (groupBy === 'visibility') {
							groupKey = quest.visibility === true || quest.visibility === 'true' ? 'Hidden' : 'Visible';
						} else if (groupBy === 'group') {
							groupKey = H.getQuestGroupNameByWeight(quest.group) || 'Ungrouped';
						} else {
							groupKey = quest[groupBy] || 'Ungrouped';
						}
						if (!acc[groupKey]) acc[groupKey] = [];
						acc[groupKey].push(quest);
						return acc;
					  }, {})
					: { All: quests };
				Object.keys(groupedQuests).forEach(groupKey => {
					menu += groupBy ? `<h4>${groupKey}</h4>` : '';
					const sortedQuests = groupedQuests[groupKey].sort((a, b) => {
						const nameA = (a.name || '').toLowerCase();
						const nameB = (b.name || '').toLowerCase();
						return nameA.localeCompare(nameB);
					});
					if (type === 'quest') {
						menu += '<ul>';
						sortedQuests.forEach(quest => {
							menu += `
								<li style="${styles.overflow}">
									<span style="${styles.floatLeft}"><small>${quest.name || 'Unnamed Quest'}</small></span>
									<span style="${styles.floatRight}">
										<a style="${styles.button}" href="!qt-menu action=quest|id=${quest.id}">Inspect</a>
										<a style="${styles.button} ${styles.smallButton}" href="!qt-quest action=removequest|id=${quest.id}|confirmation=?{Type DELETE into this field to confirm deletion of this quest|}">-</a>
									</span>
								</li>`;
						});
					} else {
						const totalRumours = quests.reduce((sum, quest) => sum + quest.rumourCount, 0);
						menu += `<h4>Total: ${totalRumours} rumour${totalRumours === 1 ? '' : 's'}</h4><ul>`;
						sortedQuests.forEach(quest => {
							menu += `
								<li style="${styles.overflow}">
									<span style="${styles.floatLeft}">
										${quest.name || 'Unnamed Quest'}
										<br>
										<small>${quest.rumourCount} rumour${quest.rumourCount === 1 ? '' : 's'}</small>
									</span>
									<span style="${styles.floatRight}">
										<a style="${styles.button}" href="!qt-menu action=showQuestRumours|questId=${quest.id}">Show</a>
									</span>
								</li>`;
						});
					}
					menu += '</ul>';
				});
				return menu;
			},
			generateFilterLinks: (filterKey, filterValue, label, menuType) => {
				if (filterValue === true || filterValue === false) {
					const displayValue = filterValue ? 'True' : 'False';
					const toggleValue = filterValue ? 'false' : 'true';
					return `
						<li>${label} [<small>${displayValue}</small>]
							<small>
								<a style="${styles.filterlink}" href="!qt-filter action=modify|key=${filterKey}|value=${toggleValue}|menu=${menuType}">Change</a>
								<a style="${styles.filterlink}" href="!qt-filter action=modify|key=${filterKey}|value=|menu=${menuType}">Clear</a>
							</small>
						</li>`;
				} else {
					return `
						<li>${label}
							<small>
								<a style="${styles.filterlink}" href="!qt-filter action=modify|key=${filterKey}|value=true|menu=${menuType}">Show</a>
								<a style="${styles.filterlink}" href="!qt-filter action=modify|key=${filterKey}|value=false|menu=${menuType}">Hide</a>
							</small>
						</li>`;
				}
			},
			buildGroupByDropdown: (currentGroupBy) => {
				const options = [
					{ label: 'Group', value: 'group' },
					{ label: 'Visibility', value: 'visibility' },
					{ label: 'Handout', value: 'handout' },
					{ label: 'Disabled', value: 'disabled' }
				];
				return options
					.filter(option => option.value !== currentGroupBy)
					.map(option => `|${option.label},${option.value}`)
					.join('');
			},
			showFilterMenu: (menuType = 'quest') => {
				const FILTER = menuType === 'rumour' ? QUEST_TRACKER_RUMOUR_FILTER : QUEST_TRACKER_FILTER;
				const questGroupsTable = findObjs({ type: 'rollabletable', name: QUEST_TRACKER_ROLLABLETABLE_QUESTGROUPS })[0];
				if (errorCheck(171, 'exists', questGroupsTable, 'questGroupsTable')) return;
				const questGroups = findObjs({ type: 'tableitem', rollabletableid: questGroupsTable.id }) || [];
				const filteredGroups = Array.isArray(FILTER.filter?.group)
					? FILTER.filter.group
					: [];
				let groupList = `
					<br><strong>Quest Groups</strong>
					<ul>
					${!filteredGroups || filteredGroups.length === 0 ? '<small>All quest groups currently visible</small>' : ''}
				`;
				groupList += questGroups
					.map(group => {
						const groupName = group.get('name');
						const groupWeight = parseInt(group.get('weight'), 10);
						const isFiltered = Array.isArray(filteredGroups) && filteredGroups.includes(groupWeight);
						const action = isFiltered ? 'remove' : 'add';
						const actionText = isFiltered ? 'hide' : 'show';
						return `
							<li>${groupName}
								<small>
									<a style="${styles.filterlink}" href="!qt-filter action=${action}|key=group|value=${groupWeight}|menu=${menuType}">${actionText}</a>
								</small>
							</li>`;
					})
					.join('');
				groupList += `</ul>`;
				const hasFilters = Object.keys(FILTER.filter || {}).length > 0 || FILTER.groupBy;
				const filterDisabled = FILTER.filter?.disabled;
				const filterHidden = FILTER.filter?.hidden;
				const filterHandout = FILTER.filter?.handout;
				const currentGroupBy = FILTER.groupBy || null;
				const groupByDropdown = H.buildGroupByDropdown(currentGroupBy);
				let menu = `
					<div style="${styles.menu}">
						<span style="${styles.floatRight}">
							<a style="${styles.paddedfilterlink}" href="!qt-filter action=togglevisibility|value=${QUEST_TRACKER_FILTER_Visbility === true ? 'false' : 'true'}|menu=${menuType}">${QUEST_TRACKER_FILTER_Visbility === true ? 'Hide' : 'Show'}</a>
							${hasFilters ? `<a style="${styles.paddedfilterlink}" href="!qt-filter action=clear|menu=${menuType}">Clear</a>` : ''}
						</span>
						<h3>Filters</h3>
				`;
				if (QUEST_TRACKER_FILTER_Visbility) {
					if (menuType === 'quest') {
						menu += `
							<ul>
								${!Object.keys(FILTER.filter || {}).length ? '<small>No filters applied</small>' : ''}
								${H.generateFilterLinks('disabled', filterDisabled, 'Disabled', menuType)}
								${H.generateFilterLinks('hidden', filterHidden, 'Hidden', menuType)}
								${H.generateFilterLinks('handout', filterHandout, 'Handout', menuType)}
							</ul>
							${groupList}
							<br><strong>Group by</strong>
							<small>
								<a style="${styles.filterlink}" href="!qt-filter action=modify|key=groupBy|value=?{Choose${groupByDropdown}}|menu=${menuType}">${currentGroupBy || 'add'}</a>
								${currentGroupBy ? ` | <a style="${styles.filterlink}" href="!qt-filter action=resetGrouping|key=groupBy|value=|menu=${menuType}">Clear</a>` : ''}
							</small>
						`;
					}
					else menu += groupList;
				}
				menu += `</div>`;
				menu = menu.replace(/[\r\n]/g, '');
				return menu;
			},
			getTriggerName: (triggerId) => {
				const triggerPath = Triggers.locateItem(triggerId, 'trigger');
				if (!triggerPath) return null;
				const trigger = Utils.getNestedProperty(QUEST_TRACKER_Triggers, triggerPath.replace('QUEST_TRACKER_Triggers.', ''));
				if (!trigger) return null;
				return trigger.name || 'Unnamed Trigger';
			},
			createQuestDropdown: () => {
				const sortedQuests = QUEST_TRACKER_globalQuestArray
					.map(quest => {
						const questName = Utils.roll20MacroSanitize(H.getQuestName(quest.id) || 'Unnamed Quest');
						return { questName, questId: quest.id };
					})
					.sort((a, b) => a.questName.localeCompare(b.questName));
				if (sortedQuests.length === 0) return null;
				if (sortedQuests.length === 1) return sortedQuests[0].questId;
				const allQuests = sortedQuests
					.map(quest => `${quest.questName},${quest.questId}`)
					.join('|');
				return `?{Select Quest|${allQuests}}`;
			},
			createEventDropdown: () => {
				const sortedEvents = Object.entries(QUEST_TRACKER_Events)
					.map(([eventId, event]) => {
						const eventName = Utils.roll20MacroSanitize(H.getEventName(eventId));
						return { eventName, eventId };
					})
					.sort((a, b) => a.eventName.localeCompare(b.eventName));
				if (sortedEvents.length === 0) return null;
				if (sortedEvents.length === 1) return sortedEvents[0].eventId;
				const allEvents = sortedEvents
					.map(event => `${event.eventName},${event.eventId}`)
					.join('|');

				return `?{Select Event|${allEvents}}`;
			},
			createTriggerDropdown: (current, includeCurrent = false) => {
				const allTriggers = [];
				const collectTriggers = (category, label = "Trigger") => {
					Object.entries(category).forEach(([parentId, triggers]) => {
						Object.entries(triggers).forEach(([triggerId, trigger]) => {
							if (includeCurrent || triggerId !== current) {
								allTriggers.push(`${trigger.name || `Unnamed ${label}`},${triggerId}`);
							}
						});
					});
				};
				collectTriggers(QUEST_TRACKER_Triggers.quests, "Quest Trigger");
				collectTriggers(QUEST_TRACKER_Triggers.dates, "Date Trigger");
				collectTriggers(QUEST_TRACKER_Triggers.reactions, "Reaction Trigger");
				collectTriggers(QUEST_TRACKER_Triggers.rumours, "Rumour Trigger");
				collectTriggers(QUEST_TRACKER_Triggers.events, "Event Trigger");
				Object.entries(QUEST_TRACKER_Triggers.scripts).forEach(([triggerId, trigger]) => {
					if (includeCurrent || triggerId !== current) {
						allTriggers.push(`${trigger.name || "Unnamed Script"},${triggerId}`);
					}
				});
				if (allTriggers.length === 0) return null;
				if (allTriggers.length === 1) return allTriggers[0].split(',')[1];
				return `?{Select Trigger|${allTriggers.join('|')}}`;
			},
			effectDropdown: (actionType) => {
				if(!actionType) return null; 
				switch (actionType?.toLowerCase()) {
					case "hidden":
						return `?{Visibility Changes to|True,true|False,false}`;
					case "enabled":
						return `?{Enabled Changes to|True,true|False,false}`;
					case "disabled":
						return `?{State Changes to|False,false|True,true}`;
					case "status": {
						const statusOptions = Object.entries(Statuses.getAll())
							.map(([id, status]) => `${status.name},${id}`)
							.join('|');
						return `?{Select Status|${statusOptions}}`;
					}
					default:
						return `?{No options available}`;
				}
			},
			triggerEffectTypeDropdown: (effecttype) => {
				switch ((effecttype || 'quest').toLowerCase()) {
					case 'event':
						return 'enabled';
					case 'flag':
						return '?{Choose Field|Status,status|Value,value|Name,name|Category,category|Description,description}';
					case 'trigger':
						return '?{Choose Field|Enabled,enabled|Active,active|Name,name|Date,date|Quest,quest|Reaction,reaction|Rumour,rumour|Event,event|Delete,delete|Quest Action Type,actiontype|Quest Action Effect,actioneffect}';
					case 'quest':
					default:
						return '?{Choose Type|Status Change,status|Toggle: Visibility,hidden|Toggle: State,disabled}';
				}
			},
			triggerEffectValueDropdown: (effect, triggerId) => {
				const effecttype = (effect.effecttype || 'quest').toLowerCase();
				switch (effecttype) {
					case 'quest':
						return H.effectDropdown(effect.type);
					case 'event':
						return '?{Enabled Changes to|True,true|False,false}';
					case 'flag':
						if (effect.type === 'status') return `?{Flag Status${Flags.buildStatusDropdown()}}`;
						return `?{Set Flag ${effect.type || 'Value'}|${effect.value || ''}}`;
					case 'trigger':
						switch (effect.type) {
							case 'enabled':
							case 'active':
								return '?{Set Trigger State|True,true|False,false}';
							case 'name':
								return `?{Trigger Name|${effect.value || ''}}`;
							case 'date':
								return '?{Set Trigger Date}';
							case 'quest':
								return H.createQuestDropdown();
							case 'reaction':
								return H.createTriggerDropdown(triggerId, true);
							case 'rumour':
								return '?{Set Rumour ID}';
							case 'event':
								return H.createEventDropdown();
							case 'script':
								return 'null';
							case 'delete':
								return 'true';
							case 'actiontype':
								return '?{Quest Trigger Action Type|Status,status|Hidden,hidden|Disabled,disabled}';
							case 'actioneffect':
								return '?{Quest Trigger Action Effect}';
							default:
								return '?{Set Value}';
						}
					default:
						return '?{Set Value}';
				}
			},
			getTriggerEffectTargetName: (effect, triggerId) => {
				const effecttype = (effect.effecttype || 'quest').toLowerCase();
				if (effect.id === null || effect.id === undefined || effect.id === '') {
					return effecttype === 'trigger' ? 'This Trigger' : `Choose ${effecttype.charAt(0).toUpperCase() + effecttype.slice(1)}`;
				}
				switch (effecttype) {
					case 'quest':
						return H.getQuestName(effect.id);
					case 'event':
						return H.getEventName(effect.id);
					case 'flag':
						return Flags.getFlag(effect.id)?.name || effect.id;
					case 'trigger':
						return H.getTriggerName(effect.id) || (effect.id === triggerId ? 'This Trigger' : effect.id);
					default:
						return effect.id;
				}
			},
			getTriggerEffectValueLabel: (effect) => {
				if (effect.value === null || effect.value === undefined || effect.value === '') return 'Choose Value';
				if ((effect.effecttype || 'quest') === 'quest' && effect.type === 'status') return Statuses.getName(effect.value);
				if ((effect.effecttype || 'quest') === 'flag' && effect.type === 'status') return Flags.getStatusName(effect.value);
				return `${effect.value}`.charAt(0).toUpperCase() + `${effect.value}`.slice(1);
			},
			renderTriggerEffects: (triggerId, effects, effectSet = 'effects') => {
				const effectSetParam = `|effectset=${effectSet}`;
				let effectsSection = `<table width=100%>`;
				if (effects && Object.keys(effects).length > 0) {
					Object.entries(effects).forEach(([effectId, effect]) => {
						const effecttype = effect.effecttype || 'quest';
						const effectCat = effecttype.charAt(0).toUpperCase() + effecttype.slice(1);
						const effectCatToggle = '?{Choose Effect Type|Quest,quest|Event,event|Flag,flag|Trigger,trigger}';
						const typeLabel = effect.type === null || effect.type === undefined ? 'Choose Field' : `${effect.type}`.charAt(0).toUpperCase() + `${effect.type}`.slice(1);
						const valueDropdown = H.triggerEffectValueDropdown(effect, triggerId);
						const targetDropdowns = {
							quest: H.createQuestDropdown(),
							event: H.createEventDropdown(),
							flag: H.buildFlagDropdownString(),
							trigger: H.createTriggerDropdown(triggerId, true)
						};
						const targetDropdown = targetDropdowns[effecttype] || null;
						effectsSection += `
							<tr>
								<td>&nbsp;</td>
								<td>Effect</td>
								<td><a style="${styles.button}" href="!qt-trigger action=modifyeffect|triggerid=${triggerId}|effectid=${effectId}${effectSetParam}|field=effecttype|value=${effectCatToggle}">${effectCat}</a></td>
							</tr>
							<tr>
								<td>&nbsp;</td>
								<td>${effectCat}</td>
								<td>${targetDropdown
									? `<a style="${styles.button}" href="!qt-trigger action=modifyeffect|triggerid=${triggerId}|effectid=${effectId}${effectSetParam}|field=id|value=${targetDropdown}">${H.getTriggerEffectTargetName(effect, triggerId)}</a>`
									: `<span style="${styles.buttonDisabled} ${styles.spanInline}">${H.getTriggerEffectTargetName(effect, triggerId)}</span>`}
								</td>
							</tr>
							<tr>
								<td>&nbsp;</td>
								<td>Type</td>
								<td><a style="${styles.button}" href="!qt-trigger action=modifyeffect|triggerid=${triggerId}|effectid=${effectId}${effectSetParam}|field=type|value=${H.triggerEffectTypeDropdown(effecttype)}">${typeLabel}</a></td>
							</tr>
							${effect.type !== 'delete' ? `
							<tr>
								<td>&nbsp;</td>
								<td>Value</td>
								<td>${valueDropdown
									? `<a style="${styles.button}" href="!qt-trigger action=modifyeffect|triggerid=${triggerId}|effectid=${effectId}${effectSetParam}|field=value|value=${valueDropdown}">${H.getTriggerEffectValueLabel(effect)}</a>`
									: `<span style="${styles.buttonDisabled} ${styles.spanInline}">${H.getTriggerEffectValueLabel(effect)}</span>`}
								</td>
							</tr>` : ''}
							<tr>
								<td><a style="${styles.button}" href="!qt-trigger action=removeeffect|triggerid=${triggerId}|effectid=${effectId}${effectSetParam}">Delete</a></td>
								<td colspan=2>&nbsp;</td>
							</tr>`;
					});
				}
				effectsSection += `
					<tr><td colspan=3><br></td></tr>
					<tr><td colspan=3><a style="${styles.button} ${styles.floatRight}" href="!qt-trigger action=addeffect|triggerid=${triggerId}${effectSetParam}">Add Effect</a></td></tr>
				</table>`;
				return effectsSection;
			},
			getTriggerName: (triggerId) => {
				const categories = ["quests", "dates", "reactions", "rumours", "events"];
				for (const category of categories) {
					for (const [parentId, triggers] of Object.entries(QUEST_TRACKER_Triggers[category] || {})) {
						if (triggers[triggerId]) {
							return triggers[triggerId].name || "Unnamed Trigger";
						}
					}
				}
				if (QUEST_TRACKER_Triggers.scripts && QUEST_TRACKER_Triggers.scripts[triggerId]) {
					return QUEST_TRACKER_Triggers.scripts[triggerId].name || "Unnamed Script";
				}
				return "Unnamed Trigger";
			}
		};
		const buildWeather = (isMenu = false, isHome = false) => {
			const FromValue = {
				temperature: (x) => {
					const celsius = ((-0.0113 * x * x) + (2.589 * x) - 89.2).toFixed(1);
					const fahrenheit = ((celsius * 9 / 5) + 32).toFixed(1);
					return { celsius: parseFloat(celsius), fahrenheit: parseFloat(fahrenheit) };
				},
				humidity: (x) => {
					const k = 0.1;
					const c = 50;
					const humidity = 100 / (1 + Math.exp(-k * (x - c)));
					return parseFloat(Math.max(humidity, 0).toFixed(1));
				},
				precipitation: (x) => {
					const k = 0.04;
					const maxPrecipitation = 500;
					const center = 50;
					const precipitationMm = maxPrecipitation * (Math.exp(k * (x - center)) - 1) / (Math.exp(k * (100 - center)) - 1);
					const precipitationInches = precipitationMm * 0.0393701;
					return {
						mm: parseFloat(Math.max(precipitationMm, 0).toFixed(1)),
						inches: parseFloat(Math.max(precipitationInches, 0).toFixed(1))
					};
				},
				windSpeed: (x) => {
					const maxSpeed = 400;
					const a = 5;
					const c = 400;
					const windSpeedKmh = (c / (1 + Math.exp(-0.2 * (x - 70)))) + (a * Math.pow(Math.max(x - 40, 0), 1.5)) / 50;
					const windSpeedMph = windSpeedKmh * 0.621371;
					return {
						kmh: parseFloat(windSpeedKmh.toFixed(1)),
						mph: parseFloat(windSpeedMph.toFixed(1))
					};
				},
				visibility: (x) => {
					const maxDistanceMeters = 50000;
					const visibilityMeters = maxDistanceMeters * (x / 100);
					let result = {
						imperial: {},
						metric: {}
					};
					if (visibilityMeters <= 100) {
						result.metric.distance = parseFloat(visibilityMeters.toFixed(1));
						result.metric.unit = "m";
					} else {
						result.metric.distance = parseFloat((visibilityMeters / 1000).toFixed(1));
						result.metric.unit = "km";
					}
					const visibilityFeet = visibilityMeters * 3.28084;
					if (visibilityFeet <= 100) {
						result.imperial.distance = parseFloat(visibilityFeet.toFixed(1));
						result.imperial.unit = "\"";
					} else if (visibilityFeet <= 300) {
						result.imperial.distance = parseFloat(visibilityFeet.toFixed(1));
						result.imperial.unit = "\"";
					} else {
						result.imperial.distance = parseFloat((visibilityFeet / 5280).toFixed(1));
						result.imperial.unit = "mi";
					}
					return result;
				}
			};
			const temperatureValue = FromValue.temperature(QUEST_TRACKER_CURRENT_WEATHER['rolls']['temperature']);
			const windSpeedValue = FromValue.windSpeed(QUEST_TRACKER_CURRENT_WEATHER['rolls']['wind']);
			const precipitationValue = FromValue.precipitation(QUEST_TRACKER_CURRENT_WEATHER['rolls']['precipitation']);
			const visibilityValue = FromValue.visibility(QUEST_TRACKER_CURRENT_WEATHER['rolls']['visibility']);
			const humidityDisplay = FromValue.humidity(QUEST_TRACKER_CURRENT_WEATHER['rolls']['humidity']);
			const temperatureDisplay = QUEST_TRACKER_imperialMeasurements['temperature'] ? temperatureValue['fahrenheit'] + "&deg;F" : temperatureValue['celsius'] + "&deg;C";
			const windSpeedDisplay = QUEST_TRACKER_imperialMeasurements['wind'] ? windSpeedValue['mph'] + "mph" : windSpeedValue['kmh'] + "kmh";
			const precipitationDisplay = QUEST_TRACKER_imperialMeasurements['precipitation'] ? precipitationValue['inches'] + "'" : precipitationValue['mm'] + "mm";
			const cloudCoverDisplay = QUEST_TRACKER_CURRENT_WEATHER['rolls']['cloudCover'];
			const visibilityDisplay = QUEST_TRACKER_imperialMeasurements['wind'] ? visibilityValue['imperial']['distance']  + visibilityValue['metric']['unit'] : visibilityValue['metric']['unit'] + visibilityValue['imperial']['unit'];
			const locationDropdown = H.buildLocationDropdown();
			const LunarPhaseDisplay = H.lunarPhases();
			const returnto = isMenu ? "menu=true|" : isHome ? "home=true|" : "";
			let menu = `
				<table style="width:100%;">
					<tr><td>&nbsp;</td><td>&nbsp;</td></tr>
					${LunarPhaseDisplay}
					<tr><td colspan=2><strong>Weather</strong></td></tr>
					<tr><td colspan=2><small>${QUEST_TRACKER_CURRENT_WEATHER['weatherType']}</small></td></tr>
					<tr><td colspan=2><strong>Location</strong></td></tr>
					<tr><td><small>${H.returnCurrentLocation(QUEST_TRACKER_WeatherLocation)}</small></td><td><a style="${styles.button}" href="!qt-date action=adjustlocation|${returnto}new=?{Change Location{${locationDropdown}}">Change</a></td></tr>
					<tr><td><strong>Temperature</strong></td><td>${temperatureDisplay}</td></tr>
					<tr><td colspan=2><small>${QUEST_TRACKER_CURRENT_WEATHER['scaleDescriptions']['temperature']}</small></td></tr>
					<tr><td><strong>Precipitation</strong></td><td>${precipitationDisplay}</td></tr>
					<tr><td colspan=2><small>${QUEST_TRACKER_CURRENT_WEATHER['scaleDescriptions']['precipitation']}</small></td></tr>
					<tr><td><strong>Wind</strong></td><td>${windSpeedDisplay}</td></tr>
					<tr><td colspan=2><small>${QUEST_TRACKER_CURRENT_WEATHER['scaleDescriptions']['wind']}</small></td></tr>
					<tr><td><strong>Humidity</strong></td><td>${humidityDisplay}%</td></tr>
					<tr><td colspan=2><small>${QUEST_TRACKER_CURRENT_WEATHER['scaleDescriptions']['humidity']}</small></td></tr>
					<tr><td><strong>Cloud Cover</strong></td><td>${cloudCoverDisplay}%</td></tr><tr><td colspan=2><small>${QUEST_TRACKER_CURRENT_WEATHER['scaleDescriptions']['cloudCover']}</small></td></tr><tr><td><strong>Visibility</strong></td><td>${visibilityDisplay}</td></tr>
					<tr><td colspan=2><small>${QUEST_TRACKER_CURRENT_WEATHER['scaleDescriptions']['visibility']}</small></td></tr>
				</table>`;
			if (!isMenu) {
				let newMenu = `<div style="${styles.menu}"><h3 style="margin-bottom: 10px;">Weather</h3>`;			
				newMenu += menu;
				newMenu += `</div>`;
				newMenu = newMenu.replace(/[\r\n]/g, ''); 
				Utils.sendGMMessage(newMenu);
			}
			else {
				return menu;
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
					conditions.forEach((condition, index) => {
						if (typeof condition === 'string') {
							depthMap[depth].push({
								type: 'quest',
								value: condition,
								logic: parentLogic,
								depth,
								column,
								endColumn: column + 1
							});
							column++;
						} else if (typeof condition === 'object' && condition.logic) {
							const nextDepth = depth + 1;
							const subColumnsStart = column;
							const subColumnsEnd = column + condition.conditions.length - 1;
							l.traverseLogicTree(condition.conditions, nextDepth, column, depthMap, condition.logic);
							depthMap[depth].push({
								type: 'logic',
								logic: condition.logic,
								conditions: condition.conditions.map(cond => (typeof cond === 'string' ? cond : cond.conditions)),
								depth,
								column: subColumnsStart,
								endColumn: subColumnsEnd + 1
							});
							column = subColumnsEnd + 1;
						}
					});
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
					elements.forEach((element, index) => {
						if (element.logic === 'OR' && element.type === 'quest') {
							const orGroup = elements.filter(e => e.logic === 'OR' && e.depth === element.depth);
							const conditionIds = orGroup.map(e => e.value.toLowerCase());
							let isMutuallyExclusive = conditionIds.every(q => {
								const quest = QUEST_TRACKER_globalQuestData[q];
								return quest && quest.relationships && conditionIds.some(other => quest.relationships.mutually_exclusive?.includes(other));
							});
							if (isMutuallyExclusive) {
								const startColumn = Math.min(...orGroup.map(e => e.column));
								const endColumn = Math.max(...orGroup.map(e => e.column));
								for (let col = startColumn; col < endColumn; col++) {
									if (!instructionsPerColumn[col]) instructionsPerColumn[col] = [];
									instructionsPerColumn[col].push({ type: 'r', depth, center: false });
								}
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
				},
				buildQuestListHTML: (flattenedLogic, columnInstructionsMap, depth = 0) => {
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
				}
			};
			const quest = QUEST_TRACKER_globalQuestData[questId];
			let questLayers = {};
			if (!quest || !quest.relationships || !Array.isArray(quest.relationships.conditions) || quest.relationships.conditions.length === 0) {
				return `<ul style="${styles.ulStyle}"> ${d.drawQuestBox("Q", [])} </ul>`;
			}
			else {
				const flattenedLogic = l.processConditions(quest.relationships.conditions, quest.relationships.logic || 'AND');
				const columnInstructionsMap = l.buildQuestTreeBottomUp(quest.relationships);
				let html = `<div style="${styles.treeContainerStyle}"><div style="${styles.treeStyle}">`;
				html += l.buildQuestListHTML(flattenedLogic, columnInstructionsMap, 0);
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
			let menu = `<div style="${styles.menu}"><h3 style="margin-bottom: 10px;">Calendar</h3>`;
			menu += `<br>${Calendar.formatDateFull()}<br>( ${QUEST_TRACKER_currentDate} )`;
			if (QUEST_TRACKER_WEATHER && QUEST_TRACKER_CURRENT_WEATHER !== null) {
				menu += buildWeather({ isMenu: true });
			}
			menu += `<br><br><a style="${styles.button}" href="!qt-menu action=adjustdate">Adjust Date</a>`;
			menu += `<br><hr><h3 style="margin-bottom: 10px;">Active Quests</h3>`;
			menu += H.showActiveQuests();
			menu += `<br><a style="${styles.button}" href="!qt-menu action=allquests">Show All Quests</a>`;
			menu += `<br><a style="${styles.button}" href="!qt-menu action=flags">Campaign Flags</a>`;
			menu += `<br><hr><h3 style="margin-bottom: 10px;">Active Rumours</h3>`;
			menu += H.showActiveRumours();
			menu += `<br><a style="${styles.button}" href="!qt-menu action=allrumours">Show All Rumours</a>`;
			menu += `<br><hr><h3 style="margin-bottom: 10px;">Automation</h3>`;
			menu += H.showTriggers();
			menu += `<br><a style="${styles.button}" href="!qt-menu action=triggers">Show All Triggers</a>`;
			menu += `<br><hr><h3 style="margin-bottom: 10px;">Upcoming Events</h3>`;
			menu += H.showUpcomingEvents();
			menu += `<br><a style="${styles.button}" href="!qt-menu action=allevents">Show All Events</a>`;
			menu += `<br><hr><a style="${styles.button} ${styles.floatRight}" href="!qt-menu action=config">Configuration</a>`;
			menu += `</div>`;
			menu = menu.replace(/[\r\n]/g, ''); 
			Utils.sendGMMessage(menu);
		};
		const showAllQuests = () => {
			QUEST_TRACKER_FILTER.filter = QUEST_TRACKER_FILTER.filter || {};
			QUEST_TRACKER_FILTER.groupBy = QUEST_TRACKER_FILTER.groupBy || null;
			let menu = `<div style="${styles.menu}"><h3 style="margin-bottom: 10px;">All Quests</h3>`;
			menu += H.showFilterMenu('quest') + "<br>";
			if (Object.keys(QUEST_TRACKER_globalQuestData).length === 0) {
				menu += `
					<p>There doesn't seem to be any Quests. You need to create a quest or Import from the Handouts.</p>
				`;
			} else {
				const filteredQuests = QUEST_TRACKER_globalQuestArray
					.map(quest => {
						const questData = QUEST_TRACKER_globalQuestData[quest.id];
						if (questData) {
							const normalizedData = Object.keys(questData).reduce((acc, key) => {
								acc[key.toLowerCase()] = questData[key];
								return acc;
							}, {});
							return H.applyFilter(QUEST_TRACKER_FILTER.filter, normalizedData)
								? { ...quest, ...normalizedData }
								: null;
						}
						return null;
					})
					.filter(Boolean);
				menu += H.renderQuestList(filteredQuests, QUEST_TRACKER_FILTER.groupBy);
			}
			menu += `
				<br><hr>
				<span style="${styles.floatRight}">
					<a style="${styles.button}" href="!qt-menu action=triggers">Triggers</a>
					&nbsp;
					<a style="${styles.button}" href="!qt-menu action=manageQuestGroups">Groups</a>
					&nbsp;
					<a style="${styles.button}" href="!qt-quest action=addquest">Add New</a>
				</span>
				<br><hr>
				<a style="${styles.button}" href="!qt-menu action=main">Back to Main Menu</a>
			</div>`;
			menu = menu.replace(/[\r\n]/g, '');
			Utils.sendGMMessage(menu);
		};
		const showAllRumours = () => {
			QUEST_TRACKER_RUMOUR_FILTER.filter = QUEST_TRACKER_RUMOUR_FILTER.filter || {};
			QUEST_TRACKER_RUMOUR_FILTER.groupBy = QUEST_TRACKER_RUMOUR_FILTER.groupBy || null;
			let menu = `<div style="${styles.menu}"><h3 style="margin-bottom: 10px;">All Rumours</h3>`;
			menu += H.showFilterMenu('rumour') + "<br>";
			menu += `<p>This menu displays all the rumours currently associated with quests. Use the options below to filter, navigate through locations, and modify rumours.</p>`;
			if (Object.keys(QUEST_TRACKER_globalQuestData).length === 0) {
				menu += `<p>There are no quests available. You need to create quests or import from handouts.</p>`;
			} else {
				const filteredQuests = Object.keys(QUEST_TRACKER_globalQuestData)
					.map(questId => {
						const questData = QUEST_TRACKER_globalQuestData[questId] || {};
						const normalizedData = Object.keys(questData).reduce((acc, key) => {
							acc[key.toLowerCase()] = questData[key];
							return acc;
						}, {});
						if (!H.applyFilter(QUEST_TRACKER_RUMOUR_FILTER.filter, normalizedData)) return null;
						const questRumours = QUEST_TRACKER_globalRumours[questId] || {};
						let rumourCount = Object.values(questRumours)
							.reduce((sum, statusRumours) => 
								sum + Object.values(statusRumours)
									.reduce((locSum, locationRumours) =>
										locSum + Object.keys(locationRumours).length,
									0), 0);
						return {
							id: questId,
							name: questData.name || `Quest: ${questId}`,
							rumourCount
						};
					})
					.filter(Boolean)
					.sort((a, b) => a.name.localeCompare(b.name));
				menu += H.renderQuestList(filteredQuests, QUEST_TRACKER_RUMOUR_FILTER.groupBy, 'rumour');
			}
			menu += `
				<br><hr>
				<span style="${styles.floatRight}">
					<a style="${styles.button}" href="!qt-menu action=manageRumourLocations">Manage Locations</a>
					&nbsp;
					<a style="${styles.button}" href="!qt-menu action=main">Back to Main</a>
				</span>
			</div>`;
			menu = menu.replace(/[\r\n]/g, '');
			Utils.sendGMMessage(menu);
		};
		const showQuestRumourByStatus = (questId) => {
			let questData = QUEST_TRACKER_globalQuestData[questId];
			const questDisplayName = questData && questData.name ? questData.name : `Quest: ${questId}`;
			let menu = `<div style="${styles.menu}"><h3 style="margin-bottom: 10px;">Rumours for ${questDisplayName}</h3>`;
			menu += `<p>${questData.description || "No description available."}</p>`;
			const questRumours = QUEST_TRACKER_globalRumours[questId] || {};
			const allStatuses = Object.values(Statuses.getAll()).map(status => status.name);
			if (allStatuses.length > 0) {
				menu += `<br><hr><table style="width:100%;">`;
				allStatuses.forEach(status => {
					const rumoursByLocation = questRumours[status.toLowerCase()] || {};
					const rumourCount = Object.values(rumoursByLocation).reduce((count, locationRumours) => {
						return count + Object.keys(locationRumours).length;
					}, 0);
					menu += `
					<tr>
						<td>${status}<br><small>${rumourCount} rumour${rumourCount === 1 ? '' : 's'}</small></td>
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
			const statusName = Statuses.getName(statusId) || statusId;
			let menu = `<div style="${styles.menu}"><h3 style="margin-bottom: 10px;">Rumours for ${questDisplayName}</h3><h3>Status: ${statusName}</h3>`;
			menu += `<p>This menu displays all the rumours currently associated with ${questDisplayName} under the status "${statusName}". Use the options below to update, add, or remove rumours.</p><p>To add new lines into the rumours use &#37;NEWLINE&#37;. To add in quotation marks you need to use &amp;quot;.</p><ul><li>Hover over 👁 to view full rumour Text<li>b = background rumour, toggle to a priority rumour.<li>∞ measn this can be shown multiple times, '1' means it is deleted after being shown only once.<li>T - add a trigger to this rumour event.</ul><br><hr>`;
			const locationTable = findObjs({ type: 'rollabletable', name: QUEST_TRACKER_ROLLABLETABLE_LOCATIONS })[0];
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
			let locationMapping = locationItems.map(location => ({
				originalName: location.get('name'),
				sanitizedName: Utils.sanitizeString(location.get('name').toLowerCase()),
				weight: location.get('weight')
			}));
			locationMapping.sort((a, b) => {
				if (a.sanitizedName === 'everywhere') return -1;
				if (b.sanitizedName === 'everywhere') return 1;
				return a.originalName.localeCompare(b.originalName);
			});
			const questRumours = QUEST_TRACKER_globalRumours[questId] || {};
			const rumoursByStatus = questRumours[statusId.toLowerCase()] || {};
			locationMapping.forEach(({ originalName, sanitizedName, weight }) => {
				const locationRumours = rumoursByStatus[sanitizedName] || {};
				menu += `<h4>${originalName}</h4><table style="width:100%;">`;
				if (Object.keys(locationRumours).length > 0) {
					Object.entries(locationRumours).forEach(([rumourId, rumourData]) => {
						const cleanRumour = rumourId.replace(/^rumour_(\d+)$/, 'Rumour #$1');
						const rumourTextSanitized = rumourData.text.replace(/"/g, '&quot;').replace(/%NEWLINE%|<br>/g, ' | ');
						const rumourInputSanitized = rumourData.text.replace(/"/g, '&quot;').replace(/<br>/g, '%NEWLINE%');
						const rumourType = rumourData.type || "background"; 
						menu += `
						<tr>
							<td><small style="${styles.rumour}">${cleanRumour}</small></td>
							<td style="${styles.smallButtonContainer}">
								<span class=icon style="${styles.button} ${styles.smallButton}" width="12px" height="12px" title="${rumourTextSanitized}">👁</span>
							</td>
							<td style="${styles.smallButtonContainer}">
								<a style="${styles.button} ${styles.smallButton}" href="!qt-rumours action=update|questid=${questId}|status=${statusId.toLowerCase()}|location=${weight}|rumourid=${rumourId}|new=?{Update Rumour|${rumourInputSanitized}}">c</a>
							</td>
							<td style="${styles.smallButtonContainer}">
								<a style="${styles.button} ${styles.smallButton}" href="!qt-rumours action=remove|questid=${questId}|status=${statusId.toLowerCase()}|location=${weight}|rumourid=${rumourId}">-</a>
							</td>
							<td style="${styles.smallButtonContainer}">
								<a style="${styles.button} ${styles.smallButton}" href="!qt-rumours action=changeType|questid=${questId}|status=${statusId.toLowerCase()}|location=${weight}|rumourid=${rumourId}">${rumourType === 'priority' ? 'p' : 'b'}</a>
							</td>
							<td style="${styles.smallButtonContainer}">
								<a style="${styles.button} ${styles.smallButton}" href="!qt-rumours action=toggleOnce|questid=${questId}|status=${statusId.toLowerCase()}|location=${weight}|rumourid=${rumourId}">${rumourData.once ? '1' : '∞'}</a>
							</td>
							<td style="${styles.smallButtonContainer}">
								<a style="${styles.button} ${styles.smallButton}" href="!qt-trigger action=addrumour|rumourid=${rumourId}">T</a>
							</td>
						</tr>`;
					});
				} else {
					menu += `<tr><td colspan="6"><small>No rumours</small></td></tr>`;
				}
				menu += `
				<tr style="border-top: 1px solid #ddd">
					<td></td>
					<td colspan="5" style="${styles.smallButtonAdd}">
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
			const quest = QUEST_TRACKER_globalQuestData[questId];
			if (!quest) {
				Utils.sendGMMessage(`Error: Quest "${questId}" not found.`);
				return;
			}
			if (quest.handout && H.updateLinkedQuestHandout(questId)) {
				Utils.sendGMMessage(`
					<div style="${styles.menu}">
						<h3 style="margin-bottom: 10px;">${quest.name || 'Unnamed Quest'}</h3>
						<p>Linked quest handout updated.</p>
						<a style="${styles.button}" href="http://journal.roll20.net/handout/${quest.handout}">Open Handout</a>
						&nbsp;<a style="${styles.button}" href="!qt-quest action=linkhandout|current=${questId}|key=?{How to Link|Auto Link,AUTO|Manual Link,?{Key&#125;">Change Link</a>
					</div>`.replace(/[\r\n]/g, ''));
				return;
			}
			let menu = H.buildQuestDetailsHtml(questId);
			menu = menu.replace(/[\r\n]/g, '');
			Utils.sendGMMessage(menu);
		};
		const manageRumourLocations = () => {
			let menu = `<div style="${styles.menu}"><h3 style="margin-bottom: 10px;">Manage Rumour Locations</h3>`;
			let locationTable = findObjs({ type: 'rollabletable', name: QUEST_TRACKER_ROLLABLETABLE_LOCATIONS })[0];
			if (!locationTable) {
				menu += `<p>Error: Locations table not found. Please check if the table exists in the game.</p></div>`;
				Utils.sendGMMessage(menu.replace(/[\r\n]/g, ''));
				return;
			}
			let locationItems = findObjs({ type: 'tableitem', rollabletableid: locationTable.id });
			let everywhereLocation = locationItems.find(loc => loc.get('name').toLowerCase() === 'everywhere');
			let otherLocations = locationItems
				.filter(loc => loc.get('name').toLowerCase() !== 'everywhere')
				.sort((a, b) => a.get('name').localeCompare(b.get('name')));
			let uniqueLocations = new Set();
			if (everywhereLocation) {
				otherLocations.unshift(everywhereLocation);
			}
			otherLocations.forEach(location => {
				let locationName = location.get('name');
				let locationKey = locationName.toLowerCase();
				let locationId = location.get('weight');
				if (!uniqueLocations.has(locationKey)) {
					uniqueLocations.add(locationKey);
					let rumourCount = QUEST_TRACKER_rumoursByLocation[locationKey] ? Object.keys(QUEST_TRACKER_rumoursByLocation[locationKey]).length : 0;
					let showButtons = !(locationId === 1 || locationKey === 'everywhere');
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
		const manageQuestGroups = () => {
			let menu = `<div style="${styles.menu}"><h3 style="margin-bottom: 10px;">Manage Quest Groups</h3>`;
			let groupTable = findObjs({ type: 'rollabletable', name: QUEST_TRACKER_ROLLABLETABLE_QUESTGROUPS })[0];
			if (!groupTable) {
				menu += `<p>Error: Quest Groups table not found. Please check if the table exists in the game.</p></div>`;
			}
			else {
				let groupItems = findObjs({ type: 'tableitem', rollabletableid: groupTable.id });
				let uniqueGroups = new Set();
				groupItems.sort((a, b) => a.get('weight') - b.get('weight')).forEach(group => {
					let groupName = group.get('name');
					let groupKey = groupName.toLowerCase();
					let groupId = group.get('weight');
					if (!uniqueGroups.has(groupKey)) {
						uniqueGroups.add(groupKey);
						let questCount = 0;
						Object.keys(QUEST_TRACKER_globalQuestData).forEach(questId => {
							let questData = QUEST_TRACKER_globalQuestData[questId];
							if (questData.group && parseInt(questData.group) === parseInt(groupId)) {
								questCount++;
							}
						});
						let plural = (questCount === 1) ? '' : 's';
						menu += `<li style="${styles.column}">
								<span style="${styles.floatLeft}">${groupName}<br><small>${questCount} Quest${plural}</small></span>
								<span style="${styles.floatRight}">`;
						menu += `<a style="${styles.button} ${styles.smallButton}" href="!qt-questgroup action=update|groupid=${groupId}|old=${groupName}|new=?{Update Group Name|${groupName}}">c</a>
								 <a style="${styles.button} ${styles.smallButton}" href="!qt-questgroup action=remove|groupid=${groupId}|confirmation=?{Type CONFIRM to confirm removal of this group|}">-</a>`;
						menu += `</span></li>`;
					}
				});
			}
			menu += `<br><a style="${styles.button}" href="!qt-questgroup action=add|new=?{New Group Name}">Add New Group</a>`;
			menu += `<br><hr><a style="${styles.button}" href="!qt-menu action=allquests">Back to Quests</a></div>`;
			menu = menu.replace(/[\r\n]/g, ''); 
			Utils.sendGMMessage(menu);
		};
		const manageQuestStatuses = () => {
			let menu = `<div style="${styles.menu}"><h3 style="margin-bottom: 10px;">Manage Quest Statuses</h3>`;
			Object.entries(Statuses.getAll()).forEach(([id, status]) => {
				const isDefault = Statuses.isDefault(id);
				menu += `<li style="${styles.column}">
					<span style="${styles.floatLeft}"><span style="color:${status.color};">[color]</span> ${status.name}<br><small>ID ${id}${isDefault ? ' default' : ''}; active ${status.active ? 'yes' : 'no'}</small></span>
					<span style="${styles.floatRight}">
						<a style="${styles.button} ${styles.smallButton}" href="!qt-status action=update|id=${id}|field=name|new=?{Status Name|${status.name}}">n</a>
						<a style="${styles.button} ${styles.smallButton}" href="!qt-status action=update|id=${id}|field=color|new=?{Status Colour|${status.color}}">c</a>
						<a style="${styles.button} ${styles.smallButton}" href="!qt-status action=update|id=${id}|field=active|new=${status.active ? 'false' : 'true'}">a</a>
						${isDefault ? '' : `<a style="${styles.button} ${styles.smallButton}" href="!qt-status action=remove|id=${id}|confirmation=?{Type DELETE to remove this status|}">-</a>`}
					</span>
				</li>`;
			});
			menu += `<br><a style="${styles.button}" href="!qt-status action=add|name=?{Status Name}|color=?{Status Colour|#CCCCCC}">Add Status</a>`;
			menu += `<br><a style="${styles.button}" href="!qt-status action=reset|confirmation=?{Type CONFIRM to restore default statuses|}">Reset Defaults</a>`;
			menu += `<br><hr><a style="${styles.button}" href="!qt-menu action=config">Back to Configuration</a></div>`;
			Utils.sendGMMessage(menu.replace(/[\r\n]/g, ''));
		};
		const showFlags = () => {
			let menu = `<div style="${styles.menu}"><h3 style="margin-bottom: 10px;">Campaign Flags</h3>`;
			const flagEntries = Object.entries(QUEST_TRACKER_Flags).sort((a, b) => {
				const categorySort = (a[1].category || '').localeCompare(b[1].category || '');
				if (categorySort !== 0) return categorySort;
				return (a[1].name || a[0]).localeCompare(b[1].name || b[0]);
			});
			if (flagEntries.length === 0) {
				menu += `<p>No campaign flags have been created.</p>`;
			} else {
				let currentCategory = null;
				flagEntries.forEach(([key, flagData]) => {
					const category = flagData.category || 'general';
					const statusName = Flags.getStatusName(flagData.status);
					const statusColor = Flags.getStatusColor(flagData.status);
					if (category !== currentCategory) {
						currentCategory = category;
						menu += `<h4>${category}</h4>`;
					}
					menu += `<li style="${styles.column}">
						<span style="${styles.floatLeft}">${flagData.name || key}<br><small>${key}: ${flagData.value}; <span style="color:${statusColor};">${statusName}</span></small></span>
						<span style="${styles.floatRight}">
							<a style="${styles.button} ${styles.smallButton}" href="!qt-flag action=set|key=${key}|value=?{Flag Value|${flagData.value}}">v</a>
							<a style="${styles.button} ${styles.smallButton}" href="!qt-flag action=setstatus|key=${key}|status=?{Flag Status${Flags.buildStatusDropdown()}}">s</a>
							<a style="${styles.button} ${styles.smallButton}" href="!qt-flag action=update|key=${key}|field=name|new=?{Flag Name|${flagData.name || key}}">n</a>
							<a style="${styles.button} ${styles.smallButton}" href="!qt-flag action=update|key=${key}|field=category|new=?{Category|${category}}">c</a>
							<a style="${styles.button} ${styles.smallButton}" href="!qt-flag action=remove|key=${key}|confirmation=?{Type DELETE to remove this flag|}">-</a>
						</span>
					</li>`;
				});
			}
			menu += `<br><a style="${styles.button}" href="!qt-flag action=add|name=?{Flag Name}|value=?{Initial Value|false}|category=?{Category|general}|status=?{Flag Status${Flags.buildStatusDropdown()}}">Add Flag</a>`;
			menu += `&nbsp;<a style="${styles.button}" href="!qt-menu action=flagStatuses">Manage Statuses</a>`;
			menu += `<br><hr><a style="${styles.button}" href="!qt-menu action=main">Back to Main Menu</a></div>`;
			Utils.sendGMMessage(menu.replace(/[\r\n]/g, ''));
		};
		const manageFlagStatuses = () => {
			let menu = `<div style="${styles.menu}"><h3 style="margin-bottom: 10px;">Manage Flag Statuses</h3>`;
			Object.entries(Flags.getStatuses()).forEach(([id, status]) => {
				const isDefault = Flags.isDefaultStatus(id);
				const flagCount = Object.values(QUEST_TRACKER_Flags).filter(flagData => `${flagData.status}` === `${id}`).length;
				menu += `<li style="${styles.column}">
					<span style="${styles.floatLeft}"><span style="color:${status.color};">[color]</span> ${status.name}<br><small>ID ${id}${isDefault ? ' default' : ''}; ${flagCount} flag${flagCount === 1 ? '' : 's'}</small></span>
					<span style="${styles.floatRight}">
						<a style="${styles.button} ${styles.smallButton}" href="!qt-flag action=updatestatus|id=${id}|field=name|new=?{Status Name|${status.name}}">n</a>
						<a style="${styles.button} ${styles.smallButton}" href="!qt-flag action=updatestatus|id=${id}|field=color|new=?{Status Colour|${status.color}}">c</a>
						${isDefault ? '' : `<a style="${styles.button} ${styles.smallButton}" href="!qt-flag action=removestatus|id=${id}|confirmation=?{Type DELETE to remove this status|}">-</a>`}
					</span>
				</li>`;
			});
			menu += `<br><a style="${styles.button}" href="!qt-flag action=addstatus|name=?{Status Name}|color=?{Status Colour|#CCCCCC}">Add Status</a>`;
			menu += `<br><a style="${styles.button}" href="!qt-flag action=resetstatuses|confirmation=?{Type CONFIRM to restore default flag statuses|}">Reset Defaults</a>`;
			menu += `<br><hr><a style="${styles.button}" href="!qt-menu action=flags">Back to Flags</a></div>`;
			Utils.sendGMMessage(menu.replace(/[\r\n]/g, ''));
		};
		const adminMenu = () => {
			let menu = `<div style="${styles.menu}"><h3 style="margin-bottom: 10px;">Quest Tracker Configuration</h3>`;
			let RefreshImport = "Import";
			if (Object.keys(QUEST_TRACKER_globalQuestData).length !== 0) {
				RefreshImport = "Refresh";
			}
			const calenderDropdown = H.buildCalenderDropdown();
			const climateDropdown = H.buildClimateDropdown();
			menu += `<br><h4>Settings</h4><a style="${styles.button} ${styles.floatClearRight}" href="!qt-config action=togglereadableJSON|value=${QUEST_TRACKER_readableJSON === true ? 'false' : 'true'}">Toggle Readable JSON (${QUEST_TRACKER_readableJSON === true ? 'on' : 'off'})</a>`;
			// menu += `<br><a style="${styles.button} ${styles.floatClearRight}" href="!qt-config action=togglejumpgate|value=${QUEST_TRACKER_jumpGate === true ? 'false' : 'true'}">Toggle JumpGate (${QUEST_TRACKER_jumpGate === true ? 'on' : 'off'})</a>`;
			menu += `<br><a style="${styles.button} ${styles.floatClearRight}" href="!qt-config action=toggleVerboseErrors|value=${QUEST_TRACKER_verboseErrorLogging === true ? 'false' : 'true'}">Toggle Verbose Errors (${QUEST_TRACKER_verboseErrorLogging === true ? 'on' : 'off'})</a>`;
			menu += `<br clear=all><h4>Data</h4><a style="${styles.button} ${styles.floatClearRight}" href="!qt-import">${RefreshImport} JSON Data</a>`;
			menu += `<br><a style="${styles.button} ${styles.floatClearRight}" href="!qt-config action=checkVersion">Check Version</a>`;
			menu += `<br><a style="${styles.button} ${styles.floatClearRight}" href="!qt-config action=reset|confirmation=?{Are you sure? This will also clear all historical weather data. Type CONFIRM to continue|}">Reset to Defaults</a>`;
			menu += `<br clear=all><h4>Quest Statuses</h4><a style="${styles.button} ${styles.floatClearRight}" href="!qt-menu action=statuses">Manage Quest Statuses</a>`;
			menu += `<br clear=all><h4>Quest Tree</h4><a style="${styles.button} ${styles.floatClearRight}" href="!qt-questtree action=build|force=true">Build Quest Tree Page</a>`;
			menu += `<br><h4>Calander</h4><a style="${styles.button} ${styles.floatClearRight}" href="!qt-date action=setcalender|new=?{Choose Calender${calenderDropdown}}">Calendar: ${CALENDARS[QUEST_TRACKER_calenderType]?.name || "Unknown Calendar"}</a>`;
			menu += `<br clear=all><h4>Weather</h4><br><a style="${styles.button} ${styles.floatClearRight}" href="!qt-config action=toggleWeather|value=${QUEST_TRACKER_WEATHER === true ? 'false' : 'true'}">Toggle Weather (${QUEST_TRACKER_WEATHER === true ? 'on' : 'off'})</a>`;
			if (QUEST_TRACKER_WEATHER) {
				menu += `<br><a style="${styles.button} ${styles.floatClearRight}" href="!qt-date action=setclimate|new=?{Choose Calender${climateDropdown}}">Climate: ${QUEST_TRACKER_Location}</a>`;
				menu += `<br clear=all><h4>Weather Trends</h4><br><a style="${styles.button} ${styles.floatClearRight}" href="!qt-date action=settrend|field=dry|new=?{Set Trend}">Dry: ${QUEST_TRACKER_WEATHER_TRENDS['dry'] || 0}</a>`;
				menu += `<br><a style="${styles.button} ${styles.floatClearRight}" href="!qt-date action=settrend|field=wet|new=?{Set Trend}">Wet: ${QUEST_TRACKER_WEATHER_TRENDS['wet'] || 0}</a>`;
				menu += `<br><a style="${styles.button} ${styles.floatClearRight}" href="!qt-date action=settrend|field=heat|new=?{Set Trend}">Heat: ${QUEST_TRACKER_WEATHER_TRENDS['heat'] || 0}</a>`;
				menu += `<br><a style="${styles.button} ${styles.floatClearRight}" href="!qt-date action=settrend|field=cold|new=?{Set Trend}">Cold: ${QUEST_TRACKER_WEATHER_TRENDS['cold'] || 0}</a>`;
				menu += `<br><a style="${styles.button} ${styles.floatClearRight}" href="!qt-date action=settrend|field=wind|new=?{Set Trend}">Wind: ${QUEST_TRACKER_WEATHER_TRENDS['wind'] || 0}</a>`;
				menu += `<br><a style="${styles.button} ${styles.floatClearRight}" href="!qt-date action=settrend|field=humid|new=?{Set Trend}">Humidity: ${QUEST_TRACKER_WEATHER_TRENDS['humid'] || 0}</a>`;
				menu += `<br><a style="${styles.button} ${styles.floatClearRight}" href="!qt-date action=settrend|field=visibility|new=?{Set Trend}">Fog: ${QUEST_TRACKER_WEATHER_TRENDS['visibility'] || 0}</a>`;
				menu += `<br><a style="${styles.button} ${styles.floatClearRight}" href="!qt-date action=settrend|field=cloudy|new=?{Set Trend}">Cloud Cover: ${QUEST_TRACKER_WEATHER_TRENDS['cloudy'] || 0}</a>`;
				menu += `<br clear=all><h4>Forced Weather Trends</h4><br><a style="${styles.button} ${styles.floatClearRight}" href="!qt-date action=forcetrend|field=dry">Dry: ${QUEST_TRACKER_FORCED_WEATHER_TRENDS['dry'] || 'False'}</a>`;
				menu += `<br><a style="${styles.button} ${styles.floatClearRight}" href="!qt-date action=forcetrend|field=wet">Wet: ${QUEST_TRACKER_FORCED_WEATHER_TRENDS['wet'] || 'False'}</a>`;
				menu += `<br><a style="${styles.button} ${styles.floatClearRight}" href="!qt-date action=forcetrend|field=heat">Heat: ${QUEST_TRACKER_FORCED_WEATHER_TRENDS['heat'] || 'False'}</a>`;
				menu += `<br><a style="${styles.button} ${styles.floatClearRight}" href="!qt-date action=forcetrend|field=cold">Cold: ${QUEST_TRACKER_FORCED_WEATHER_TRENDS['cold'] || 'False'}</a>`;
				menu += `<br><a style="${styles.button} ${styles.floatClearRight}" href="!qt-date action=forcetrend|field=wind">Wind: ${QUEST_TRACKER_FORCED_WEATHER_TRENDS['wind'] || 'False'}</a>`;
				menu += `<br><a style="${styles.button} ${styles.floatClearRight}" href="!qt-date action=forcetrend|field=humid">Humidity: ${QUEST_TRACKER_FORCED_WEATHER_TRENDS['humid'] || 'False'}</a>`;
				menu += `<br><a style="${styles.button} ${styles.floatClearRight}" href="!qt-date action=forcetrend|field=visibility">Visibility: ${QUEST_TRACKER_FORCED_WEATHER_TRENDS['visibility'] || 'False'}</a>`;
				menu += `<br><a style="${styles.button} ${styles.floatClearRight}" href="!qt-date action=forcetrend|field=cloudy">Cloud Cover: ${QUEST_TRACKER_FORCED_WEATHER_TRENDS['cloudy'] || 'False'}</a>`;
				menu += `<br clear=all><h4>Imperial Measurements</h4><br><a style="${styles.button} ${styles.floatClearRight}" href="!qt-config action=toggleimperial|type=temperature|value=${QUEST_TRACKER_imperialMeasurements['temperature'] === true ? 'false' : 'true'}">Temperature: ${QUEST_TRACKER_imperialMeasurements['temperature'] || 'False'}</a>`;
				menu += `<br><a style="${styles.button} ${styles.floatClearRight}" href="!qt-config action=toggleimperial|type=precipitation|value=${QUEST_TRACKER_imperialMeasurements['precipitation'] === true ? 'false' : 'true'}">Precipitation: ${QUEST_TRACKER_imperialMeasurements['precipitation'] || 'False'}</a>`;
				menu += `<br><a style="${styles.button} ${styles.floatClearRight}" href="!qt-config action=toggleimperial|type=wind|value=${QUEST_TRACKER_imperialMeasurements['wind'] === true ? 'false' : 'true'}">Wind: ${QUEST_TRACKER_imperialMeasurements['wind'] || 'False'}</a>`;
				menu += `<br><a style="${styles.button} ${styles.floatClearRight}" href="!qt-config action=toggleimperial|type=visibility|value=${QUEST_TRACKER_imperialMeasurements['visibility'] === true ? 'false' : 'true'}">Visibility: ${QUEST_TRACKER_imperialMeasurements['visibility'] || 'False'}</a>`;
			}
			menu += `<br clear=all><hr><a style="${styles.button} ${styles.floatClearRight}" href="!qt-menu action=main">Back to Main Menu</a>`;
			menu += `</div>`;
			menu = menu.replace(/[\r\n]/g, ''); 
			Utils.sendGMMessage(menu);
		};
		const showAllEvents = () => {
			let menu = `<div style="${styles.menu}"><h3 style="margin-bottom: 10px;">All Events</h3>`;
			if (Object.keys(QUEST_TRACKER_Events).length === 0) {
				menu += `
					<p>There doesn't seem to be any Events, you need to create a quest or Import from the Handouts.</p>
				`;
			} else {
				menu += `<ul style="${styles.list}">`;
				Object.keys(QUEST_TRACKER_Events).forEach(eventId => {
					const event = QUEST_TRACKER_Events[eventId];
					const name = event.name;
					const date = event.date;
					menu += `
						<li style="${styles.overflow}">
							<span style="${styles.floatLeft}">
								${name}
								<br>
								<small>${date}</small>
							</span>
							<span style="${styles.floatRight}">
								<a style="${styles.button}" href="!qt-menu action=showevent|eventid=${eventId}">Inspect</a>
								<a style="${styles.button} ${styles.smallButton}" href="!qt-date action=removeevent|eventid=${eventId}|confirmation=?{Type DELETE into this field to confirm deletion of this quest|}">x</a>
							</span>
						</li>
							`;
				});
				menu += `</ul>`;
			}
			menu += `
				<br><hr>
				<span style="${styles.floatRight}">
					<a style="${styles.button}" href="!qt-date action=addevent">Add New Event</a>
				</span>
				<br><hr>
				<a style="${styles.button}" href="!qt-menu action=main">Back to Main Menu</a>
			</div>`;
			menu = menu.replace(/[\r\n]/g, ''); 
			Utils.sendGMMessage(menu);
		};
		const showEventDetails = (eventid) => {
			let event = QUEST_TRACKER_Events[eventid];
			if (!event) {
				Utils.sendGMMessage(`Error: Event "${eventid}" not found.`);
				return;
			}
			let enabledStatus = event.enabled ? 'Yes' : 'No';
			let enabledStatusTorF = event.enabled ? 'true' : 'false';
			let enabledStatusTorF_reverse = event.enabled ? 'false' : 'true';
			let hiddenStatus = event.hidden ? 'Yes' : 'No';
			let hiddenStatusTorF = event.hidden ? 'true' : 'false';
			let hiddenStatusTorF_reverse = event.hidden ? 'false' : 'true';
			let repeatStatus = event.repeatable ? 'Yes' : 'No';
			let repeatStatusTorF = event.repeatable ? 'true' : 'false';
			let repeatStatusTorF_reverse = event.repeatable ? 'false' : 'true';
			const frequencyDropdown = H.buildFrequencyDropdown();
			const showFrequency = event.repeatable ? `<br><br><span>Frequency: <small>${frequencyMapping[event.frequency]}</small></span><span style="${styles.floatRight}"><a style="${styles.button}" href="!qt-date action=update|field=frequency|current=${eventid}|date=${event.date}|old=${event.frequency}|new=?{Frequency${frequencyDropdown}}">Adjust</a></span>` : '';
			let menu = `
				<div style="${styles.menu}">
					<h3 style="margin-bottom: 10px;">${event.name || 'Unnamed Event'}</h3>
					<p>${event.description || 'No description available.'}</p>
					<span style="${styles.floatRight}">
						<a style="${styles.button}" href="!qt-date action=update|field=name|current=${eventid}|old=${event.name || ''}|new=?{Title|${event.name || ''}}">Edit Event Name</a>
						&nbsp;
						<a style="${styles.button}" href="!qt-date action=update|field=description|current=${eventid}|old=${event.description || ''}|new=?{Description|${event.description || ''}}">Edit Description</a>
					</span>
					<br>
					<h4 style="${styles.bottomBorder} ${styles.topMargin}">${event.repeatable ? 'Starting ' : ''}Date</h4><br>
					<span>${event.date}</span>
					<span style="${styles.floatRight}">
						<a style="${styles.button}" href="!qt-date action=update|field=date|current=${eventid}|old=${event.date}|new=?{Change${event.repeatable ? 'Starting ' : ''} Date, Must be digits separated by dashes (e.g., YYYY-MM-DD or similar).}">Change</a>
					</span>
					<br>
					<h4 style="${styles.bottomBorder} ${styles.topMargin}">Hidden</h4><br>
					<span>${hiddenStatus}</span>
					<span style="${styles.floatRight}">
						<a style="${styles.button}" href="!qt-date action=update|field=hidden|current=${eventid}|old=${hiddenStatusTorF}|new=${hiddenStatusTorF_reverse}">Change</a>
					</span>
					<br>
					<h4 style="${styles.bottomBorder} ${styles.topMargin}">Enabled</h4><br>
					<span>${enabledStatus}</span>
					<span style="${styles.floatRight}">
						<a style="${styles.button}" href="!qt-date action=update|field=enabled|current=${eventid}|old=${enabledStatusTorF}|new=${enabledStatusTorF_reverse}">Change</a>
					</span>
					<br>
					<h4 style="${styles.bottomBorder} ${styles.topMargin}">Repeatable</h4><br>
					<span>${repeatStatus}</span>
					<span style="${styles.floatRight}">
						<a style="${styles.button}" href="!qt-date action=update|field=repeatable|current=${eventid}|old=${repeatStatusTorF}|new=${repeatStatusTorF_reverse}">Change</a>
					</span>
					${showFrequency}`;
			if (event.repeatable && event.frequency === "2") {
				menu += `<br><small>Occurs every ${event.weekdayname  || 'Unknown'}</small>`;
			}
			menu += `<br><hr>
					<a style="${styles.button}" href="!qt-menu action=allevents">All Events</a>
					&nbsp;
					<a style="${styles.button}" href="!qt-menu action=main">Back to Main Menu</a>
				</div>`;
			menu = menu.replace(/[\r\n]/g, ''); 
			Utils.sendGMMessage(menu);
		};
		const adjustDate = () => {
			let menu = `
				<div style="${styles.menu}">
					<h3 style="margin-bottom: 10px;">Adjust Date</h3>
					<br>${Calendar.formatDateFull()}<br>( ${QUEST_TRACKER_currentDate} )`;
			if (QUEST_TRACKER_WEATHER && QUEST_TRACKER_CURRENT_WEATHER !== null) {
				menu += buildWeather({ isHome: true });
			}
			menu += `<br><br><a style="${styles.button} ${styles.floatRight}" href="!qt-date action=set|menu=true|new=?{Set Current Date|}">Set Date</a>
					<br><hr><h3>Advance Date</h3>`;
			if (QUEST_TRACKER_WEATHER) {
				menu += `<small>Advancing Dates calculates weather so there are hard limits imposed.</small>`;
			}
			menu += `<br><a style="${styles.button}" href="!qt-date action=modify|menu=true|unit=day|new=1">Day</a>
					&nbsp;<a style="${styles.button}" href="!qt-date action=modify|menu=true|unit=week|new=1">Week</a>
					&nbsp;<a style="${styles.button}" href="!qt-date action=modify|menu=true|unit=month|new=1">Month</a>
					&nbsp;<a style="${styles.button}" href="!qt-date action=modify|menu=true|unit=year|new=1">Year</a>
					<br><strong>Custom</strong>`;
			if (QUEST_TRACKER_WEATHER) {	
				menu += `<br><a style="${styles.button}" href="!qt-date action=modify|menu=true|unit=day|new=?{Enter number of Days, Max 500}">Day</a>
					&nbsp;<a style="${styles.button}" href="!qt-date action=modify|menu=true|unit=week|new=?{Enter number of Weeks, Max 60}">Week</a>
					&nbsp;<a style="${styles.button}" href="!qt-date action=modify|menu=true|unit=month|new=?{Enter number of Months, max 15}">Month</a>`;
			}
			else {
				menu += `<br><a style="${styles.button}" href="!qt-date action=modify|menu=true|unit=day|new=?{Enter number of Days}">Day</a>
					&nbsp;<a style="${styles.button}" href="!qt-date action=modify|menu=true|unit=week|new=?{Enter number of Weeks}">Week</a>
					&nbsp;<a style="${styles.button}" href="!qt-date action=modify|menu=true|unit=month|new=?{Enter number of Months}">Month</a>
					&nbsp;<a style="${styles.button}" href="!qt-date action=modify|menu=true|unit=month|new=?{Enter number of Years}">Year</a>`;
			}
			menu += `<br><hr><h3>Retreat Date</h3>`;
			if (QUEST_TRACKER_WEATHER) {
				menu += `<small>Retreating Dates does not calculate weather, so there are no limits imposed.</small>`;
			}
			menu += `<br><a style="${styles.button}" href="!qt-date action=modify|menu=true|unit=day|new=-1">Day</a>
					&nbsp;<a style="${styles.button}" href="!qt-date action=modify|menu=true|unit=week|new=-1">Week</a>
					&nbsp;<a style="${styles.button}" href="!qt-date action=modify|menu=true|unit=month|new=-1">Month</a>
					&nbsp;<a style="${styles.button}" href="!qt-date action=modify|menu=true|unit=year|new=-1">Year</a>
					<br><strong>Custom</strong>
					<br><a style="${styles.button}" href="!qt-date action=modify|menu=true|unit=day|new=-?{Enter number of Days}">Day</a>
					&nbsp;<a style="${styles.button}" href="!qt-date action=modify|menu=true|unit=week|new=-?{Enter number of Weeks}">Week</a>
					&nbsp;<a style="${styles.button}" href="!qt-date action=modify|menu=true|unit=month|new=-?{Enter number of Months}">Month</a>
					&nbsp;<a style="${styles.button}" href="!qt-date action=modify|menu=true|unit=year|new=-?{Enter number of Years}">Year</a>
					<br><hr><h3>Special Advance</h3>
					<small>Nothing will happen if there are no Festivals, Significant Dates or Events set in your Calendar.</small>
					<br><a style="${styles.button}" href="!qt-date action=modify|menu=true|unit=event|new=1">Next Date of Significance</a>
					<br clear=all><hr><a style="${styles.button} ${styles.floatClearRight}" href="!qt-menu action=main">Back to Main Menu</a>
				</div>`;
			menu = menu.replace(/[\r\n]/g, ''); 
			Utils.sendGMMessage(menu);
		};
		const manageFilter = ({ action, key, value, menu = 'quest' }) => {
			const FILTER = menu === 'rumour' ? QUEST_TRACKER_RUMOUR_FILTER : QUEST_TRACKER_FILTER;
			if (!FILTER.filter) FILTER.filter = {};
			switch (action) {
				case 'add': {
					if (key === 'group') {
						const groupValue = parseInt(value, 10);
						FILTER.filter.group = [groupValue];
					}
					break;
				}
				case 'remove': {
					if (key === 'group') {
						const groups = Array.isArray(FILTER.filter.group)
							? [...FILTER.filter.group]
							: [];
						const groupValue = parseInt(value, 10);
						FILTER.filter.group = groups.filter(group => group !== groupValue);
					}
					break;
				}
				case 'modify': {
					if (key === 'groupBy') {
						if (value === null || value === undefined) {
							FILTER.groupBy = null;
						} else {
							const validGroupByOptions = ['group', 'visibility', 'handout', 'disabled', null];
							if (!validGroupByOptions.includes(value)) {
								errorCheck(167, 'msg', null, `Invalid value for groupBy: ${value}`);
								return;
							}
							FILTER.groupBy = value;
						}
					} else if (value === null || value === undefined) {
						delete FILTER.filter[key];
					} else {
						const normalizedValue = value === 'true' ? true : value === 'false' ? false : value;
						FILTER.filter[key] = normalizedValue;
					}
					break;
				}
				case 'clear': {
					FILTER.filter = {};
					FILTER.groupBy = null;
					break;
				}
				case 'resetGrouping': {
					FILTER.groupBy = null;
					break;
				}
				case 'sort': {
					FILTER.sortBy = value || null;
					FILTER.sortOrder = 'asc';
					break;
				}
				default:
					errorCheck(164, 'msg', null, `Unknown filter action: ${action}`);
					return;
			}
			saveQuestTrackerData();
		};
		const showAllTriggers = () => {
			Triggers.initializeTriggersStructure();
			const scriptTriggers = [];
			const allTriggers = [];
			Object.entries(QUEST_TRACKER_Triggers.scripts || {}).forEach(([triggerId, trigger]) => {
				scriptTriggers.push({ 
					id: triggerId, 
					name: trigger.name || 'Unnamed Script Trigger', 
					type: 'script', 
					enabled: trigger.enabled
				});
			});
			const triggerTypes = {
				quests: { type: 'quest', getParent: H.getQuestName, defaultParent: 'Unknown Quest' },
				dates: { type: 'date', getParent: (date) => date, defaultParent: 'Unknown Date' },
				reactions: { type: 'reaction', getParent: (parentId) => parentId, defaultParent: 'Unknown Trigger' },
				rumours: { type: 'rumour', getParent: (parentId) => parentId, defaultParent: 'Unknown Rumour' },
				events: { type: 'event', getParent: H.getEventName, defaultParent: 'Unknown Event' } // ✅ Added event category
			};
			Object.entries(triggerTypes).forEach(([category, { type, getParent, defaultParent }]) => {
				Object.entries(QUEST_TRACKER_Triggers[category] || {}).forEach(([parentId, triggers]) => {
					Object.entries(triggers).forEach(([triggerId, trigger]) => {
						allTriggers.push({ 
							id: triggerId,
							name: trigger.name || `Unnamed ${type.charAt(0).toUpperCase() + type.slice(1)}`,
							type,
							parent: getParent(parentId) || defaultParent
						});
					});
				});
			});
			allTriggers.sort((a, b) => a.name.localeCompare(b.name));
			let menu = `<div style="${styles.menu}"><h3 style="margin-bottom: 10px;">All Triggers</h3>`;
			menu += `<p>This menu displays all the triggers currently associated with quests, dates, reactions, events, and scripts.</p>`;
			if (scriptTriggers.length > 0) {
				menu += `<h4>Scripts</h4><ul style="${styles.list}">`;
				scriptTriggers.forEach(trigger => {
					menu += `
						<li style="${styles.overflow}">
							<span style="${styles.floatLeft}">
								${trigger.name}
								<br>
								<small>
									${trigger.enabled 
										? `<a style="${styles.button}" href="!qt-trigger action=execute|triggerid=${trigger.id}|menu=true">Run Script</a>` 
										: `<span style="${styles.buttonDisabled} ${styles.spanInline}">Disabled</span>`}
								</small>
							</span>
							<span style="${styles.floatRight}">
								<a style="${styles.button}" href="!qt-menu action=showTriggerDetails|id=${trigger.id}">Inspect</a>
								<a style="${styles.button} ${styles.smallButton}" href="!qt-trigger action=delete|triggerid=${trigger.id}">-</a>
							</span>
						</li>`;
				});
				menu += `</ul><br><hr>`;
			}
			if (allTriggers.length + scriptTriggers.length === 0) {
				menu += `<p>No triggers found. Click 'Add Trigger' to create one.</p>`;
			} else {
				if (allTriggers.length !== 0) menu += `<h4>Triggers</h4><ul style="${styles.list}">`;
				allTriggers.forEach(trigger => {
					const cleanRumour = trigger.type === 'rumour' 
						? trigger.parent.replace(/^rumour_(\d+)$/, 'Rumour #$1') 
						: trigger.parent;
					menu += `
						<li style="${styles.overflow}">
							<span style="${styles.floatLeft}">
								${trigger.name}
								<br>
								<small>${
									trigger.type === 'quest' 
										? trigger.parent 
										: trigger.type === 'date' 
										? trigger.parent 
										: trigger.type === 'rumour'
										? cleanRumour
										: trigger.type === 'event'
										? trigger.parent
										: H.getTriggerName(trigger.parent)
								}</small>
							</span>
							<span style="${styles.floatRight}">
								<a style="${styles.button}" href="!qt-menu action=showTriggerDetails|id=${trigger.id}">Inspect</a>
								<a style="${styles.button} ${styles.smallButton}" href="!qt-trigger action=delete|triggerid=${trigger.id}">-</a>
							</span>
						</li>`;
				});
				menu += `</ul>`;
			}
			if (allTriggers.length !== 0) menu += `<br><hr>`;
			menu += `
				<span style="${styles.floatRight}">
					<a style="${styles.button}" href="!qt-trigger action=add">Add Trigger</a>
					&nbsp;
					<a style="${styles.button}" href="!qt-menu action=allquests">Quests</a>
					&nbsp;
					<a style="${styles.button}" href="!qt-menu action=main">Main Menu</a>
				</span>
			</div>`;
			menu = menu.replace(/[\r\n]/g, '');
			Utils.sendGMMessage(menu);
		};
		const showTrigger = (triggerId) => {
			Triggers.initializeTriggersStructure();
			const triggerPath = Triggers.locateItem(triggerId, 'trigger');
			const trigger = Utils.getNestedProperty(QUEST_TRACKER_Triggers, triggerPath.replace('QUEST_TRACKER_Triggers.', ''));
			const currentType = triggerPath.match(/QUEST_TRACKER_Triggers\.(quests|dates|reactions|rumours|scripts|events)/)?.[1].replace(/s$/, '');
			const typeOptions = ['quest', 'date', 'reaction', 'rumour', 'script', 'event']
				.filter(type => type !== currentType)
				.map(type => `${type.charAt(0).toUpperCase() + type.slice(1)},${type}`)
				.join('|');
			const typeDropdownString = `?{Change Trigger Type|${typeOptions}}`;
			const enabled = !!trigger?.enabled;
			const active = currentType === 'script' ? !!trigger?.active : null;
			const capitalizedType = currentType.charAt(0).toUpperCase() + currentType.slice(1);
			let activationSection = ``;
			let effectsSection = ``;
			const triggerPathParts = triggerPath.split('.');
			const dropdownType = "?{Choose Type|Status Change,status|Toggle: Visibility,hidden|Toggle: State,disabled}";
			switch (currentType) {
				case 'quest':
					const actionType = trigger?.action?.type ? trigger.action.type.charAt(0).toUpperCase() + trigger.action.type.slice(1) : false;
					const dropdownEffect = H.effectDropdown(actionType);
					const rawEffectText = trigger?.action?.effect;
					const effectText = rawEffectText !== null && rawEffectText !== undefined
						? (actionType === "Status" ? Statuses.getName(rawEffectText) : `${rawEffectText}`.charAt(0).toUpperCase() + `${rawEffectText}`.slice(1))
						: 'Choose';
					if (H.createQuestDropdown() !== null) {
						activationSection += `<a style="${styles.button} vertical-align: top;" href="!qt-trigger action=prompt|triggerid=${triggerId}|field=quest|value=${H.createQuestDropdown()}">${triggerPathParts[2] === "null" ? `Assign Quest` : `${H.getQuestName(triggerPathParts[2])}`}</a>`;
					} else {
						activationSection += `<span style="${styles.buttonDisabled} ${styles.spanInline}">No Quests</span>`;
					}
					activationSection += `<br>
						<a style="${styles.button}" href="!qt-trigger action=action|triggerid=${triggerId}|type=${dropdownType}">${actionType ? actionType : 'Choose Type'}</a>
						${actionType ? `<br><a style="${styles.button}" href="!qt-trigger action=effect|triggerid=${triggerId}|type=${dropdownEffect}">${effectText}</a>` : `<br><span style="${styles.buttonDisabled} ${styles.spanInline}">${effectText}</span>`}
					`;
					break;
				case 'date':
					activationSection += `<a style="${styles.button}" href="!qt-trigger action=prompt|triggerid=${triggerId}|field=date|value=?{Set Date}">${triggerPathParts[2] === "null" ? `Set Date` : `${triggerPathParts[2]}`}</a>`;
					break;
				case 'reaction':
					if (H.createTriggerDropdown(triggerId) !== null) {
						activationSection += `<a style="${styles.button}" href="!qt-trigger action=prompt|triggerid=${triggerId}|field=reaction|value=${H.createTriggerDropdown(triggerId)}">${triggerPathParts[2] === "null" || H.getTriggerName(triggerPathParts[2]) === null ? `Set Trigger` : `${H.getTriggerName(triggerPathParts[2])}`}</a>`;
					} else {
						activationSection += `<span style="${styles.buttonDisabled} ${styles.spanInline}">No Triggers Set</span>`;
					}
					break;
				case 'rumour':
					const cleanRumour = triggerPathParts[2].replace(/^rumour_(\d+)$/, 'Rumour #$1');
					activationSection += `<a style="${styles.button}" href="!qt-trigger action=prompt|triggerid=${triggerId}|field=rumour|value=?{Provide Rumour ID}">${triggerPathParts[2] === "null" ? `Set Rumour ID` : `${cleanRumour}`}</a>`;
					break;
				case 'event':
					if (H.createEventDropdown(triggerId) !== null) {
						activationSection += `<a style="${styles.button}" href="!qt-trigger action=prompt|triggerid=${triggerId}|field=event|value=${H.createEventDropdown(triggerId)}">${triggerPathParts[2] === "null" || H.getEventName(triggerPathParts[2]) === null ? `Set Event` : `${H.getEventName(triggerPathParts[2])}`}</a>`;
					} else {
						activationSection += `<span style="${styles.buttonDisabled} ${styles.spanInline}">No Event Set</span>`;
					}
					break;
				case 'script':
					activationSection += `<p>This script trigger executes when activated.</p>`;
					break;
			}
			const flagDropdown = H.buildFlagDropdownString();
			const addConditionControl = flagDropdown
				? `<a style="${styles.button} ${styles.floatRight}" href="!qt-trigger action=addcondition|triggerid=${triggerId}|flag=${flagDropdown}|status=?{Flag Status${Flags.buildStatusDropdown()}}">Add Flag Condition</a>`
				: `<span style="${styles.buttonDisabled} ${styles.spanInline} ${styles.floatRight}">No Flags</span>`;
			let conditionsSection = `<table width=100%>`;
			if (Array.isArray(trigger.conditions) && trigger.conditions.length > 0) {
				trigger.conditions.forEach(condition => {
					if (condition?.type !== 'flag') return;
					conditionsSection += `
						<tr>
							<td>${H.getFlagRequirementLabel(condition)}</td>
							<td style="${styles.smallButtonContainer}">
								<a style="${styles.button} ${styles.smallButton}" href="!qt-trigger action=updatecondition|triggerid=${triggerId}|oldflag=${condition.key}|oldstatus=${condition.status}|flag=${flagDropdown || condition.key}|status=?{Flag Status${Flags.buildStatusDropdown()}}">c</a>
							</td>
							<td style="${styles.smallButtonContainer}">
								<a style="${styles.button} ${styles.smallButton}" href="!qt-trigger action=removecondition|triggerid=${triggerId}|flag=${condition.key}|status=${condition.status}">-</a>
							</td>
						</tr>`;
				});
			} else {
				conditionsSection += `<tr><td><small>No flag conditions</small></td></tr>`;
			}
			conditionsSection += `<tr><td colspan=3>${addConditionControl}</td></tr></table>`;
			effectsSection = H.renderTriggerEffects(triggerId, trigger.effects, 'effects');
			const failEffectsSection = H.renderTriggerEffects(triggerId, trigger.failEffects, 'failEffects');
			let menu = `
				<div style="${styles.menu}">
					<h3 style="margin-bottom: 10px;">${trigger.name}</h3>
					<span style="${styles.floatRight}">
						<a style="${styles.filterlink}" href="!qt-trigger action=toggle|triggerid=${triggerId}|field=name|value=?{Change Name|${trigger.name}}">Edit Name</a>
					</span>
					<br><hr>
					<h4>Activation</h4>
					<table width=100%>
						<tr><td>Enabled</td><td><a style="${styles.button}" href="!qt-trigger action=toggle|triggerid=${triggerId}|field=enabled|value=${enabled ? 'false' : 'true'}">${enabled ? 'Enabled' : 'Disabled'}</a></td></tr>
						${currentType === 'script' ? `<tr><td>Active</td><td><a style="${styles.button}" href="!qt-trigger action=toggle|triggerid=${triggerId}|field=active|value=${active ? 'false' : 'true'}">${active ? 'Enabled' : 'Disabled'}</a></td></tr>` : ``}					
						<tr><td>Trigger Type</td><td><a style="${styles.button}" href="!qt-trigger action=changetype|triggerid=${triggerId}|newType=${typeDropdownString}">${capitalizedType}</a></td></tr>
						<tr><td>Triggering Event</td><td>${activationSection}</td></tr>
					</table>
					<br><hr>
					<h4>Conditions</h4>
					${conditionsSection}
					<br><hr>
					<h4>Effects</h4>
					${effectsSection}
					<br><hr>
					<h4>Fail Effects</h4>
					${failEffectsSection}
					<br><hr>
					<a style="${styles.button}" href="!qt-menu action=triggers">All Triggers</a>
				</div>`;
			menu = menu.replace(/[\r\n]/g, '');
			Utils.sendGMMessage(menu);
		};
		QUEST_TRACKER_refreshLinkedQuestHandouts = (questId = null) => {
			if (questId) H.updateLinkedQuestHandout(questId);
			else H.updateAllLinkedQuestHandouts();
		};
		return {
			generateGMMenu,
			showQuestDetails,
			showAllQuests,
			showAllRumours,
			showRumourDetails,
			showQuestDetails,
			showQuestRumourByStatus,
			showAllEvents,
			showEventDetails,
			manageRumourLocations,
			manageQuestGroups,
			manageQuestStatuses,
			showFlags,
			manageFlagStatuses,
			adminMenu,
			adjustDate,
			buildWeather,
			manageFilter,
			showAllTriggers,
			showTrigger,
			updateLinkedQuestHandout: H.updateLinkedQuestHandout,
			updateAllLinkedQuestHandouts: H.updateAllLinkedQuestHandouts
		};
	})(); 
	const handleInput = (msg) => {
		if (msg.type !== 'api' || !playerIsGM(msg.playerid) || !msg.content.startsWith('!qt')) {
			return;
		}
		msg.content = Utils.inputAlias(msg.content);
		const args = msg.content.split(' ');
		const command = args.shift();
		const params = args.join(' ').split('|').reduce((acc, param) => {
			const [key, value] = param.split('=');
			if (key && value) {
				acc[key.trim()] = value.trim();
			}
			return acc;
		}, {});
		loadQuestTrackerData();
		if (errorCheck(47, 'exists', command,'command')) return;
		if (command === '!qt-quest') {
			const { action, field, current, old = '', new: newItem = '', id, confirmation, key } = params;
			if (errorCheck(48, 'exists', action,'action')) return;
			switch (action) {
				case 'removequest':
					if (!errorCheck(49, 'confirmation', confirmation, 'DELETE')) return;
					if (errorCheck(50, 'exists', id,'id')) return;
					if (errorCheck(51, 'exists', QUEST_TRACKER_globalQuestData[id],`QUEST_TRACKER_globalQuestData[${id}]`)) return;
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
				case 'linkhandout':
					if (errorCheck(160, 'exists', key,'key')) return;
					if (errorCheck(161, 'exists', current,'current')) return;
					Quest.linkHandout(current,key);
					setTimeout(() => {
						Menu.showQuestDetails(current);
					}, 500);
					break;
				case 'removehandout':
					if (errorCheck(162, 'exists', current,'current')) return;
					Quest.removeHandout(current);
					setTimeout(() => {
						Menu.showQuestDetails(current);
					}, 500);
					break;
				case 'add':
				case 'remove':
				case 'update':
					if (errorCheck(52, 'exists', field,'field')) return;
					if (errorCheck(53, 'exists', newItem,'newItem')) return;
					if (errorCheck(54, 'exists', QUEST_TRACKER_globalQuestData[current],`QUEST_TRACKER_globalQuestData[${current}]`)) return;
					switch (field) {
						case 'status':
							Quest.manageQuestObject({ action, field, current, old, newItem });
							break;
						case 'name':
							if (action === 'add') {
								Quest.manageQuestObject({ action, field, current, old, newItem });
							} else if (action === 'update') {
								Quest.manageQuestObject({ action: 'remove', field, current, old });
								Quest.manageQuestObject({ action: 'add', field, current, old, newItem });
							}
							break;
						case 'description':
							if (action === 'add') {
								Quest.manageQuestObject({ action, field, current, old, newItem });
							} else if (action === 'update') {
								Quest.manageQuestObject({ action: 'remove', field, current, old });
								Quest.manageQuestObject({ action: 'add', field, current, old, newItem });
							}
							break;
						case 'disabled':
							if (action === 'update') {
								Quest.manageQuestObject({ action, field, current });
								if (newItem === 'true') {
									const linkedQuests = Quest.findDirectlyLinkedQuests(current);
									linkedQuests.forEach(questId => {
										Quest.manageQuestObject({ action, field, current: questId });
									});
								}
							}
							break;
						case 'hidden':
							if (action === 'update') {
								Quest.manageQuestObject({ action, field, current });
							}
							break;
						case 'group':
							if (action === 'update') {
									Quest.manageQuestObject({ action: 'remove', field, current, old });
								if (newItem !== 'remove') {
									Quest.manageQuestObject({ action: 'add', field, current, old, newItem });
								}								
							}
							break;
						default:
							errorCheck(59, 'msg', null,`Unsupported action for field ( ${field} )`);
							break;
					}
					setTimeout(() => {
						Menu.showQuestDetails(current);
					}, 500);
					break;
				default:
					errorCheck(60, 'msg', null,`Unsupported action for action ( ${action} )`);
					break;
			}
		} else if (command === '!qt-questrelationship') {
			const { action, type, currentquest, quest, groupConditions, groupnum, oldquest, flag, oldflag, status, oldstatus, confirmation } = params;
			if (errorCheck(61, 'exists', action,'action')) return;
			if (errorCheck(62, 'exists', type,'type')) return;
			if (errorCheck(63, 'exists', currentquest,'currentquest')) return;
			if (errorCheck(64, 'exists', QUEST_TRACKER_globalQuestData[currentquest],`QUEST_TRACKER_globalQuestData[${currentquest}]`)) return;
			switch (action) {
				case 'add':
					switch (type) {
						case 'mutuallyexclusive':
							if (errorCheck(65, 'exists', quest,'quest')) return;
							if (errorCheck(66, 'exists', QUEST_TRACKER_globalQuestData[quest],`QUEST_TRACKER_globalQuestData[${quest}]`)) return;
							Quest.manageRelationship(currentquest, 'add', 'mutuallyExclusive', quest);
							Quest.manageRelationship(quest, 'add', 'mutuallyExclusive', currentquest);
							break;
						case 'single':
							if (errorCheck(65, 'exists', quest,'quest')) return;
							if (errorCheck(66, 'exists', QUEST_TRACKER_globalQuestData[quest],`QUEST_TRACKER_globalQuestData[${quest}]`)) return;
							Quest.manageRelationship(currentquest, 'add', 'single', quest);
							break;
						case 'group':
							if (errorCheck(65, 'exists', quest,'quest')) return;
							if (errorCheck(66, 'exists', QUEST_TRACKER_globalQuestData[quest],`QUEST_TRACKER_globalQuestData[${quest}]`)) return;
							if (errorCheck(67, 'exists', groupnum,'groupnum')) return;
							Quest.manageRelationship(currentquest, 'add', 'group', quest, groupnum);
							break;
						case 'addgroup':
							if (errorCheck(65, 'exists', quest,'quest')) return;
							if (errorCheck(66, 'exists', QUEST_TRACKER_globalQuestData[quest],`QUEST_TRACKER_globalQuestData[${quest}]`)) return;
							Quest.manageRelationship(currentquest, 'add', 'addgroup', quest);
							break;
						case 'flag': {
							if (errorCheck(271, 'exists', flag, 'flag')) return;
							if (!Flags.getFlag(flag)) {
								errorCheck(272, 'msg', null, `Unknown flag: ${flag}`);
								return;
							}
							if (errorCheck(273, 'exists', status, 'status')) return;
							if (!Flags.getStatusIdFromValue(status)) {
								errorCheck(281, 'msg', null, `Unknown flag status: ${status}`);
								return;
							}
							const flagCondition = Quest.buildFlagCondition(flag, status);
							Quest.manageRelationship(currentquest, 'add', groupnum ? 'group' : 'single', flagCondition, groupnum);
							break;
						}
						default:
							errorCheck(68, 'msg', null,`Unsupported action for type ( ${type} )`);
							break;
					}
					break;
				case 'remove':
					switch (type) {
						case 'mutuallyexclusive':
							if (errorCheck(69, 'exists', quest,'quest')) return;
							if (errorCheck(70, 'exists', QUEST_TRACKER_globalQuestData[quest],`QUEST_TRACKER_globalQuestData[${quest}]`)) return;
							if (errorCheck(71, 'exists', quest,'quest')) return;
							Quest.manageRelationship(currentquest, 'remove', 'mutuallyExclusive', quest);
							Quest.manageRelationship(quest, 'remove', 'mutuallyExclusive', currentquest);
							break;
						case 'single':
							if (errorCheck(72, 'exists', quest,'quest')) return;
							if (errorCheck(73, 'exists', QUEST_TRACKER_globalQuestData[quest],`QUEST_TRACKER_globalQuestData[${quest}]`)) return;
							if (errorCheck(74, 'exists', quest,'quest')) return;
							Quest.manageRelationship(currentquest, 'remove', 'single', quest);
							break;
						case 'group':
							if (errorCheck(75, 'exists', quest,'quest')) return;
							if (errorCheck(76, 'exists', QUEST_TRACKER_globalQuestData[quest],`QUEST_TRACKER_globalQuestData[${quest}]`)) return;
							if (errorCheck(77, 'exists', groupnum,'groupnum')) return;
							Quest.manageRelationship(currentquest, 'remove', 'group', quest, groupnum);
							break;
						case 'flag': {
							if (errorCheck(274, 'exists', flag, 'flag')) return;
							if (errorCheck(275, 'exists', status, 'status')) return;
							const flagCondition = Quest.buildFlagCondition(flag, status);
							Quest.manageRelationship(currentquest, 'remove', groupnum ? 'group' : 'single', flagCondition, groupnum);
							break;
						}
						case 'removegroup':
							if (errorCheck(78, 'exists', groupnum,'groupnum')) return;
							if (!errorCheck(79, 'confirmation', confirmation, 'DELETE')) return;
							Quest.manageRelationship(currentquest, 'remove', 'removegroup', null, groupnum);
							break;
						default:
							errorCheck(80, 'msg', null,`Unsupported action for type ( ${type} )`);
							break;
					}
					break;
				case 'update':
					switch (type) {
						case 'mutuallyexclusive':
							if (errorCheck(81, 'exists', quest,'quest')) return;
							if (errorCheck(82, 'exists', oldquest,'oldquest')) return;
							Quest.manageRelationship(currentquest, 'remove', 'mutuallyExclusive', oldquest);
							Quest.manageRelationship(oldquest, 'remove', 'mutuallyExclusive', currentquest);
							Quest.manageRelationship(currentquest, 'add', 'mutuallyExclusive', quest);
							Quest.manageRelationship(quest, 'add', 'mutuallyExclusive', currentquest);
							break;
						case 'single':
							if (errorCheck(83, 'exists', quest,'quest')) return;
							Quest.manageRelationship(currentquest, 'add', 'single', quest);
							Quest.manageRelationship(currentquest, 'remove', 'single', oldquest);
							break;
						case 'group':
							if (errorCheck(84, 'exists', quest,'quest')) return;
							if (errorCheck(85, 'exists', oldquest,'oldquest')) return;
							Quest.manageRelationship(currentquest, 'add', 'group', quest, groupnum);
							Quest.manageRelationship(currentquest, 'remove', 'group', oldquest, groupnum);
							break;
						case 'flag': {
							if (errorCheck(276, 'exists', flag, 'flag')) return;
							if (!Flags.getFlag(flag)) {
								errorCheck(277, 'msg', null, `Unknown flag: ${flag}`);
								return;
							}
							if (errorCheck(278, 'exists', status, 'status')) return;
							if (!Flags.getStatusIdFromValue(status)) {
								errorCheck(282, 'msg', null, `Unknown flag status: ${status}`);
								return;
							}
							if (errorCheck(279, 'exists', oldflag, 'oldflag')) return;
							if (errorCheck(280, 'exists', oldstatus, 'oldstatus')) return;
							const newFlagCondition = Quest.buildFlagCondition(flag, status);
							const oldFlagCondition = Quest.buildFlagCondition(oldflag, oldstatus);
							Quest.manageRelationship(currentquest, 'add', groupnum ? 'group' : 'single', newFlagCondition, groupnum);
							Quest.manageRelationship(currentquest, 'remove', groupnum ? 'group' : 'single', oldFlagCondition, groupnum);
							break;
						}
						case 'grouplogic':
							Quest.manageRelationship(currentquest, 'update', 'grouplogic', null, groupnum);
							break;
						case 'logic':
							Quest.manageRelationship(currentquest, 'update', 'logic', null);
							break;
						default:
							errorCheck(86, 'msg', null,`Unsupported action for type ( ${type} )`);
							break;
					}
					break;
				default:
					errorCheck(87, 'msg', null,`Unsupported action for action ( ${action} )`);
					break;
			}
			setTimeout(() => {
				Menu.showQuestDetails(currentquest);
			}, 500);
		} else if (command === '!qt-rumours') {
			const { action, questid, status, location, rumourid, new: newItem, number, locationId, old, confirmation } = params;
			if (errorCheck(88, 'exists', action, 'action')) return;
			switch (action) {
				case 'send':
					if (errorCheck(89, 'exists', number, 'number')) return;
					if (errorCheck(90, 'number', number, 'number')) return;
					if (errorCheck(91, 'exists', location, 'location')) return;
					Rumours.sendRumours(location, number);
					break;
				case 'add':
				case 'update':
				case 'remove':
					if (errorCheck(92, 'exists', location, 'location')) return;
					if (errorCheck(93, 'exists', status, 'status')) return;
					if (errorCheck(94, 'exists', questid, 'questid')) return;
					if (action === 'add') {
						if (errorCheck(95, 'exists', newItem, 'newItem')) return;
						let cleanedItem = newItem.replace(/[\r\n]/g, '');
						cleanedItem = cleanedItem.replace(/<br\s*\/?>/g, '%NEWLINE%');
						Rumours.manageRumourObject({ action: 'add', questId: questid, newItem: cleanedItem, status, location });
						setTimeout(() => {
							Menu.showRumourDetails(questid, status);
						}, 500);
					} else if (action === 'update') {
						if (errorCheck(96, 'exists', newItem, 'newItem')) return;
						if (errorCheck(97, 'exists', rumourid, 'rumourid')) return;
						if (errorCheck(98, 'exists', QUEST_TRACKER_globalRumours[questid], `QUEST_TRACKER_globalRumours[${questid}]`)) return;
						let cleanedItem = newItem.replace(/[\r\n]/g, '');
						cleanedItem = cleanedItem.replace(/<br\s*\/?>/g, '%NEWLINE%');
						Rumours.manageRumourObject({ action: 'remove', questId: questid, newItem: '', status, location, rumourId: rumourid });
						Rumours.manageRumourObject({ action: 'add', questId: questid, newItem: cleanedItem, status, location, rumourId: rumourid });
						setTimeout(() => {
							Menu.showRumourDetails(questid, status);
						}, 500);
					} else if (action === 'remove') {
						if (errorCheck(99, 'exists', QUEST_TRACKER_globalRumours[questid], `QUEST_TRACKER_globalRumours[${questid}]`)) return;
						if (errorCheck(100, 'exists', QUEST_TRACKER_globalRumours[questid][status], `QUEST_TRACKER_globalRumours[${questid}][${status}]`)) return;
						if (errorCheck(101, 'exists', Rumours.getLocationNameById(location), `getLocationNameById(${location})`)) return;
						if (errorCheck(102, 'exists', QUEST_TRACKER_globalRumours[questid][status][Rumours.getLocationNameById(location).toLowerCase()], `QUEST_TRACKER_globalRumours[${questid}][${status}][getLocationNameById(${location}).toLowerCase()]`)) return;
						Rumours.manageRumourObject({ action: 'remove', questId: questid, newItem: '', status, location, rumourId: rumourid });
						setTimeout(() => {
							Menu.showRumourDetails(questid, status);
						}, 500);
					}
					break;
				case 'toggleOnce':
					if (errorCheck(225, 'exists', questid, 'questid')) return;
					if (errorCheck(226, 'exists', status, 'status')) return;
					if (errorCheck(227, 'exists', location, 'location')) return;
					if (errorCheck(228, 'exists', rumourid, 'rumourid')) return;
					Rumours.manageRumourObject({ action: 'toggleOnce', questId: questid, status, location, rumourId: rumourid });
					setTimeout(() => {
						Menu.showRumourDetails(questid, status);
					}, 500);
					break;
				case 'changeType':
					if (errorCheck(229, 'exists', questid, 'questid')) return;
					if (errorCheck(230, 'exists', status, 'status')) return;
					if (errorCheck(231, 'exists', location, 'location')) return;
					if (errorCheck(232, 'exists', rumourid, 'rumourid')) return;
					Rumours.manageRumourObject({ action: 'changeType', questId: questid, status, location, rumourId: rumourid });
					setTimeout(() => {
						Menu.showRumourDetails(questid, status);
					}, 500);
					break;
				case 'addLocation':
					if (errorCheck(103, 'exists', newItem, 'newItem')) return;
					Rumours.manageRumourLocation('add', newItem, null);
					setTimeout(() => {
						Menu.manageRumourLocations();
					}, 500);
					break;
				case 'editLocationName':
					if (errorCheck(104, 'exists', newItem, 'newItem')) return;
					if (errorCheck(105, 'exists', locationId, 'locationId')) return;
					Rumours.manageRumourLocation('update', newItem, locationId);
					setTimeout(() => {
						Menu.manageRumourLocations();
					}, 500);
					break;
				case 'removeLocation':
					if (errorCheck(106, 'exists', locationId, 'locationId')) return;
					if (!errorCheck(107, 'confirmation', confirmation, 'DELETE')) return;
					Rumours.manageRumourLocation('remove', null, locationId);
					setTimeout(() => {
						Menu.manageRumourLocations();
					}, 500);
					break;
				default:
					errorCheck(108, 'msg', null,`Unsupported action for type ( ${action} )`);
					break;
			}
		} else if (command === '!qt-questgroup') {
			const { action, groupid, new: newItem, confirmation } = params;
			if (!action) return;
			switch (action) {
				case 'add':	
					if (errorCheck(109, 'exists', newItem,'newItem')) return;
					Quest.manageGroups('add', newItem, null);
					setTimeout(() => {
						Menu.manageQuestGroups();
					}, 500);
					break;
				case 'update':
					if (errorCheck(110, 'exists', newItem,'newItem')) return;
					if (errorCheck(111, 'exists', groupid,'groupid')) return;
					Quest.manageGroups('update', newItem, groupid);
					setTimeout(() => {
						Menu.manageQuestGroups();
					}, 500);
					break;
				case 'remove':
					if (errorCheck(112, 'exists', groupid,'groupid')) return;
					if (!errorCheck(113, 'confirmation', confirmation, 'CONFIRM')) return;
					Quest.manageGroups('remove', null, groupid);
					setTimeout(() => {
						Menu.manageQuestGroups();
					}, 500);
					break;
				default:
					errorCheck(114, 'msg', null,`Unsupported action for type ( ${action} )`);
					break;
			}
		} else if (command === '!qt-menu') {
			const { action, id, questId, locationId, status, eventid, menu} = params;
			if (!action || action === 'main') {
				Menu.generateGMMenu();
			} else if (action === 'config') {
				Menu.adminMenu();
			} else if (action === 'quest') {
				if (errorCheck(115, 'exists', id,'id')) return;
				Menu.showQuestDetails(id);
			} else if (action === 'allquests') {
				Menu.showAllQuests();
			} else if (action === 'allrumours') {
				Menu.showAllRumours();
			} else if (action === 'showQuestRumours') {
				if (errorCheck(116, 'exists', questId,'questId')) return;
				Menu.showQuestRumourByStatus(questId);
			} else if (action === 'showRumourDetails') {
				if (errorCheck(117, 'exists', questId,'questId')) return;
				if (errorCheck(118, 'exists', status,'status')) return;
				Menu.showRumourDetails(questId, status);
			} else if (action === 'manageRumourLocations') {
				Menu.manageRumourLocations();
			} else if (action === 'manageQuestGroups') {
				Menu.manageQuestGroups();
			} else if (action === 'statuses') {
				Menu.manageQuestStatuses();
			} else if (action === 'flags') {
				Menu.showFlags();
			} else if (action === 'flagStatuses') {
				Menu.manageFlagStatuses();
			} else if (action === 'allevents') {
				Menu.showAllEvents();
			} else if (action === 'showevent') {
				if (errorCheck(119, 'exists', eventid,'eventid')) return;
				Menu.showEventDetails(eventid);
			} else if (action === 'adjustdate') {
				Menu.adjustDate();
			} else if (action === 'triggers') {
				Menu.showAllTriggers();
			} else if (action === 'showTriggerDetails') {
				Menu.showTrigger(id);
			} else errorCheck(120, 'msg', null,`Unknown menu action: ${action}`);	
		} else if (command === '!qt-status') {
			const { action, id, field, name, color, new: newItem, confirmation } = params;
			switch (action) {
				case 'add':
					if (errorCheck(237, 'exists', name, 'name')) return;
					Statuses.addStatus(name, color || '#CCCCCC');
					break;
				case 'update':
					if (errorCheck(238, 'exists', id, 'id')) return;
					if (errorCheck(239, 'exists', field, 'field')) return;
					if (errorCheck(240, 'exists', newItem, 'newItem')) return;
					if (!Statuses.updateStatus(id, field, newItem)) errorCheck(241, 'msg', null, `Unknown status: ${id}`);
					break;
				case 'remove':
					if (errorCheck(242, 'exists', id, 'id')) return;
					if (!errorCheck(243, 'confirmation', confirmation, 'DELETE')) return;
					if (!Statuses.removeStatus(id)) errorCheck(244, 'msg', null, `Cannot remove status: ${id}`);
					break;
				case 'reset':
					if (!errorCheck(245, 'confirmation', confirmation, 'CONFIRM')) return;
					Statuses.resetStatuses();
					break;
				default:
					errorCheck(246, 'msg', null, `Unknown status action: ${action}`);
					break;
			}
			setTimeout(() => {
				Menu.manageQuestStatuses();
			}, 500);
		} else if (command === '!qt-flag') {
			const { action, key, field, name, value, category, status, id, color, new: newItem, confirmation } = params;
			let returnToStatusMenu = false;
			switch (action) {
				case 'add':
					if (errorCheck(247, 'exists', name, 'name')) return;
					Flags.addFlag(name, value || 'false', category || 'general', status || 1);
					break;
				case 'set':
					if (errorCheck(248, 'exists', key, 'key')) return;
					if (errorCheck(249, 'exists', value, 'value')) return;
					if (!Flags.setFlagValue(key, value)) errorCheck(250, 'msg', null, `Unknown flag: ${key}`);
					break;
				case 'setstatus':
					if (errorCheck(259, 'exists', key, 'key')) return;
					if (errorCheck(260, 'exists', status, 'status')) return;
					if (!Flags.setFlagStatus(key, status)) errorCheck(261, 'msg', null, `Unknown flag or status: ${key}, ${status}`);
					break;
				case 'update':
					if (errorCheck(251, 'exists', key, 'key')) return;
					if (errorCheck(252, 'exists', field, 'field')) return;
					if (errorCheck(253, 'exists', newItem, 'newItem')) return;
					if (!Flags.updateFlag(key, field, newItem)) errorCheck(254, 'msg', null, `Unknown flag: ${key}`);
					break;
				case 'remove':
					if (errorCheck(255, 'exists', key, 'key')) return;
					if (!errorCheck(256, 'confirmation', confirmation, 'DELETE')) return;
					if (!Flags.removeFlag(key)) errorCheck(257, 'msg', null, `Unknown flag: ${key}`);
					break;
				case 'addstatus':
					if (errorCheck(262, 'exists', name, 'name')) return;
					Flags.addStatus(name, color || '#CCCCCC');
					returnToStatusMenu = true;
					break;
				case 'updatestatus':
					if (errorCheck(263, 'exists', id, 'id')) return;
					if (errorCheck(264, 'exists', field, 'field')) return;
					if (errorCheck(265, 'exists', newItem, 'newItem')) return;
					if (!Flags.updateStatus(id, field, newItem)) errorCheck(266, 'msg', null, `Unknown flag status: ${id}`);
					returnToStatusMenu = true;
					break;
				case 'removestatus':
				case 'deletestatus':
					if (errorCheck(267, 'exists', id, 'id')) return;
					if (!errorCheck(268, 'confirmation', confirmation, 'DELETE')) return;
					if (!Flags.removeStatus(id)) errorCheck(269, 'msg', null, `Cannot remove flag status: ${id}`);
					returnToStatusMenu = true;
					break;
				case 'resetstatuses':
					if (!errorCheck(270, 'confirmation', confirmation, 'CONFIRM')) return;
					Flags.resetStatuses();
					returnToStatusMenu = true;
					break;
				default:
					errorCheck(258, 'msg', null, `Unknown flag action: ${action}`);
					break;
			}
			setTimeout(() => {
				if (returnToStatusMenu) Menu.manageFlagStatuses();
				else Menu.showFlags();
			}, 500);
		} else if (command === '!qt-filter') {
			const { action, key, value, sortOrder, menu } = params;
			const menuActions = {
				quest: () => Menu.showAllQuests(),
				rumour: () => Menu.showAllRumours()
			};
			switch (action) {
				case 'modify':
					if (errorCheck(165, 'exists', key, 'key')) return;
					if (key === 'groupBy') {
						const validGroupByOptions = ['group', 'visibility', 'handout', 'disabled', null];
						if (!validGroupByOptions.includes(value)) {
							errorCheck(167, 'msg', null, `Invalid value for groupBy: ${value}`);
							return;
						}
					}
					Menu.manageFilter({ action, key, value, menu });
					setTimeout(() => {
						menuActions[menu]();
					}, 500);
					break;
				case 'add':
				case 'remove':
					if (errorCheck(173, 'exists', key, 'key')) return;
					if (key !== 'group') {
						errorCheck(174, 'msg', null, `Invalid key for action: ${key}`);
						return;
					}
					if (errorCheck(175, 'exists', value, 'value')) return;
					Menu.manageFilter({ action, key, value, menu });
					setTimeout(() => {
						menuActions[menu]();
					}, 500);
					break;
				case 'clear':
				case 'resetGrouping':
					Menu.manageFilter({ action, key, value, menu });
					setTimeout(() => {
						menuActions[menu]();
					}, 500);
					break;
				case 'togglevisibility':
					if (errorCheck(170, 'exists', value, 'value')) return;
					Utils.toggleFilterVisibility(value);
					setTimeout(() => {
						menuActions[menu]();
					}, 500);
					break;
				default:
					errorCheck(172, 'msg', null, `Unknown menu action: ${action}`);
					break;
			}
		} else if (command === '!qt-trigger') {
			const { action, triggerid, effectid = null, field, value, newType, type, effect, questid, rumourid, menu = "false", effectset = 'effects', flag, oldflag, status, oldstatus } = params;
			const buildTriggerFlagCondition = (flagKey, statusValue) => ({
				type: 'flag',
				key: flagKey,
				status: Flags.getStatusIdFromValue(statusValue) || parseInt(statusValue, 10) || 1
			});
			switch (action) {
				case 'add':
					Triggers.addTrigger();
					setTimeout(() => {
						Menu.showAllTriggers();
					}, 500);
					break;
				case 'addquest':
					if (errorCheck(308, 'exists', questid, 'questid')) return;
					if (errorCheck(309, 'exists', QUEST_TRACKER_globalQuestData[questid], `QUEST_TRACKER_globalQuestData[${questid}]`)) return;
					const newQuestTriggerId = Triggers.addQuestTrigger(questid);
					setTimeout(() => {
						Menu.showTrigger(newQuestTriggerId);
					}, 500);
					break;
				case 'addrumour':
					if (errorCheck(234, 'exists', rumourid, 'rumourid')) return;
					const newTriggerId = Triggers.addRumourTrigger(rumourid);
					setTimeout(() => {
						Menu.showTrigger(newTriggerId);
					}, 500);
					break;
				case 'modify':
					if (errorCheck(287, 'exists', triggerid, 'triggerid')) return;
					if (errorCheck(288, 'exists', field, 'field')) return;
					if (errorCheck(289, 'exists', value, 'value')) return;
					if (['enabled', 'active', 'name'].includes(field)) {
						Triggers.toggleTrigger(field, triggerid, value);
					} else if (["quest", "date", "reaction", "rumour", "script", "event"].includes(field)) {
						Triggers.managePrompt(field, triggerid, value);
					} else if (field === 'actiontype') {
						Triggers.manageActionEffect('action', triggerid, value);
					} else if (field === 'actioneffect') {
						Triggers.manageActionEffect('effect', triggerid, value);
					} else {
						errorCheck(290, 'msg', null, `Invalid trigger modify field: ${field}`);
						return;
					}
					setTimeout(() => {
						Menu.showTrigger(triggerid);
					}, 500);
					break;
				case 'addcondition':
					if (errorCheck(291, 'exists', triggerid, 'triggerid')) return;
					if (errorCheck(292, 'exists', flag, 'flag')) return;
					if (errorCheck(293, 'exists', status, 'status')) return;
					if (!Flags.getFlag(flag)) {
						errorCheck(294, 'msg', null, `Unknown flag: ${flag}`);
						return;
					}
					if (!Flags.getStatusIdFromValue(status)) {
						errorCheck(295, 'msg', null, `Unknown flag status: ${status}`);
						return;
					}
					Triggers.manageCondition(triggerid, 'add', buildTriggerFlagCondition(flag, status));
					setTimeout(() => {
						Menu.showTrigger(triggerid);
					}, 500);
					break;
				case 'removecondition':
					if (errorCheck(296, 'exists', triggerid, 'triggerid')) return;
					if (errorCheck(297, 'exists', flag, 'flag')) return;
					if (errorCheck(298, 'exists', status, 'status')) return;
					Triggers.manageCondition(triggerid, 'remove', buildTriggerFlagCondition(flag, status));
					setTimeout(() => {
						Menu.showTrigger(triggerid);
					}, 500);
					break;
				case 'updatecondition':
					if (errorCheck(299, 'exists', triggerid, 'triggerid')) return;
					if (errorCheck(300, 'exists', flag, 'flag')) return;
					if (errorCheck(301, 'exists', status, 'status')) return;
					if (errorCheck(302, 'exists', oldflag, 'oldflag')) return;
					if (errorCheck(303, 'exists', oldstatus, 'oldstatus')) return;
					if (!Flags.getFlag(flag)) {
						errorCheck(304, 'msg', null, `Unknown flag: ${flag}`);
						return;
					}
					if (!Flags.getStatusIdFromValue(status)) {
						errorCheck(305, 'msg', null, `Unknown flag status: ${status}`);
						return;
					}
					Triggers.manageCondition(
						triggerid,
						'update',
						buildTriggerFlagCondition(flag, status),
						buildTriggerFlagCondition(oldflag, oldstatus)
					);
					setTimeout(() => {
						Menu.showTrigger(triggerid);
					}, 500);
					break;
				case 'edit':
					if (errorCheck(183, 'exists', triggerid, 'triggerid')) return;
					if (errorCheck(184, 'exists', field, 'field')) return;
					if (!['enabled', 'action', 'effects'].includes(field)) {
						errorCheck(185, 'msg', null, `Invalid field: ${field}. Valid fields are 'enabled', 'action', 'effects'.`);
						return;
					}
					switch (field) {
						case 'enabled':
						case 'name':
							Triggers.toggleTrigger(field, triggerid, value);
							break;
						case 'action':
							Triggers.manageTriggerAction(triggerid, { key: field, value });
							break;
						case 'effects':
							if (!effectid && ['remove', 'edit'].includes(value?.key)) {
								errorCheck(186, 'msg', null, `Effect ID is required for '${value?.key}' action.`);
								return;
							}
							Triggers.manageTriggerEffects(triggerid, { effectid, key: value.key, value: value.value });
							break;
						default:
							errorCheck(207, 'msg', null, `Invalid field: ${field}`);
							return;
					}
					setTimeout(() => {
						Menu.showTrigger(triggerid);
					}, 500);
					break;
				case 'changetype':
					if (errorCheck(213, 'exists', triggerid, 'triggerid')) return;
					if (!['quest', 'date', 'reaction', 'rumour', 'script', 'event'].includes(newType)) {
						errorCheck(206, 'msg', null, `Invalid type: ${newType}. Valid types are 'quest', 'date', 'reaction', 'rumour', or 'script'.`);
						return;
					}
					Triggers.initializeTrigger(newType, triggerid);
					setTimeout(() => {
						Menu.showTrigger(triggerid);
					}, 500);
					break;
				case 'delete':
					if (errorCheck(210, 'exists', triggerid, 'triggerid')) return;
					Triggers.deleteTrigger(triggerid);
					setTimeout(() => {
						Menu.showAllTriggers();
					}, 500);
					break;
				case 'toggle':
					if (errorCheck(187, 'exists', triggerid, 'triggerid')) return;
					if (errorCheck(208, 'exists', field, 'field')) return;
					if (errorCheck(209, 'exists', value, 'value')) return;
					if (typeof value !== 'string' || value.trim() === '') {
						errorCheck(211, 'msg', null, `Invalid name value: ${value}. Must be a non-empty string.`);
						return;
					}
					if (field !== 'enabled' && field !== 'name' && field !== 'active') {
						errorCheck(212, 'msg', null, `Invalid field: ${field}. Use 'enabled', 'name' or 'active'.`);
						return;
					}
					Triggers.toggleTrigger(field, triggerid, value);
					setTimeout(() => {
						Menu.showTrigger(triggerid);
					}, 500);
					break;
				case 'prompt':
					if (errorCheck(213, 'exists', triggerid, 'triggerid')) return;
					if (errorCheck(214, 'exists', field, 'field')) return;
					if (errorCheck(215, 'exists', value, 'value')) return;
					if (field === "date") if (errorCheck(216, 'date', value)) return;
					if (!["quest", "date", "reaction", "rumour", "script", "event"].includes(field)) {
						errorCheck(216, 'msg', null, `Invalid field: ${field}. Use 'quest', 'date', 'reaction', 'rumour', or 'script'.`);
						return;
					}
					Triggers.managePrompt(field, triggerid, value);
					setTimeout(() => {
						Menu.showTrigger(triggerid);
					}, 500);
					break;
				case 'effect':
				case 'action': {
					if (field === 'action' && !["status", "disabled", "hidden"].includes(type)) {
						errorCheck(217, "msg", null, `Invalid action type: ${type}. Use 'status', 'disabled', or 'hidden'.`);
						return;
					}
					Triggers.manageActionEffect(action, triggerid, type);
					setTimeout(() => {
						Menu.showTrigger(triggerid);
					}, 500);
					break;
				}
				case 'addeffect':
					if (errorCheck(218, 'exists', triggerid, 'triggerid')) return;
					Triggers.manageEffect(triggerid, null, 'add' , null, null, effectset)
					setTimeout(() => {
						Menu.showTrigger(triggerid);
					}, 500);
					break;
				case 'removeeffect':
					if (errorCheck(219, 'exists', triggerid, 'triggerid')) return;
					if (errorCheck(220, 'exists', effectid, 'effectid')) return;
					Triggers.manageEffect(triggerid, effectid, 'delete' , null, null, effectset)
					setTimeout(() => {
						Menu.showTrigger(triggerid);
					}, 500);
					break;
				case 'modifyeffect':
					if (errorCheck(221, 'exists', triggerid, 'triggerid')) return;
					if (errorCheck(222, 'exists', effectid, 'effectid')) return;
					if (errorCheck(223, 'exists', field, 'field')) return;
					if (errorCheck(224, 'exists', value, 'value')) return;
					Triggers.manageEffect(triggerid, effectid, 'modify' , field, value, effectset)
					setTimeout(() => {
						Menu.showTrigger(triggerid);
					}, 500);
					break;
				case 'execute':
					if (errorCheck(236, 'exists', triggerid, 'triggerid')) return;
					Triggers.checkTriggers('script', triggerid)
					if (menu === "true") {
						setTimeout(() => {
							Menu.showAllTriggers();
						}, 500);
					}
					break;
				default:
					errorCheck(189, 'msg', null, `Unknown action: ${action}`);
					break;
			}	
		} else if (command === '!qt-date') {
			const { action, field, current, old, new: newItem, unit = 'day', date, eventid, menu = false, home = false} = params;
			if (errorCheck(121, 'exists', action,'action')) return;
			switch (action) {
				case 'set':
					if (errorCheck(122, 'exists', newItem)) return;
					if (errorCheck(145, 'date', newItem)) return;
					Calendar.modifyDate({type: 'set', newDate: newItem});
					if (menu) {
						setTimeout(() => {
							Menu.adjustDate();
						}, 500);
					}
					break;
				case 'addevent':
					Calendar.addEvent();
					setTimeout(() => {
						Menu.showAllEvents();
					}, 500);
					break;
				case 'removeevent':
					if (errorCheck(123, 'exists', eventid, 'eventid')) return;
					Calendar.removeEvent(eventid);
					setTimeout(() => {
						Menu.showAllEvents();
					}, 500);
					break;
				case 'update':
					if (field === 'date') {
						if (errorCheck(125, 'date', newItem)) return;
					}
					Calendar.manageEventObject({ action, field, current, old, newItem, date});
					setTimeout(() => {
						Menu.showEventDetails(current);
					}, 500);
					break;
				case 'setcalender':
					if (errorCheck(126, 'exists', newItem, 'newItem')) return;
					Calendar.setCalender(newItem);
					setTimeout(() => {
						Menu.adminMenu();
					}, 500);
					break;
				case 'setclimate':
					if (errorCheck(127, 'exists', newItem, 'newItem')) return;
					Calendar.setClimate(newItem);
					setTimeout(() => {
						Menu.adminMenu();
					}, 500);
					break;
				case 'adjustlocation':
					if (errorCheck(128, 'exists', newItem, 'newItem')) return;
					Calendar.adjustLocation(newItem);
					if (menu) {
						setTimeout(() => {
							Menu.adjustDate();
						}, 500);
					}
					else if (home) {
						setTimeout(() => {
							Menu.generateGMMenu();
						}, 500);
					}
					break;
				case 'settrend':
					if (errorCheck(129, 'exists', newItem, 'newItem')) return;
					if (errorCheck(130, 'number', newItem, 'newItem')) return;
					const num = Math.trunc(newItem);
					if (num <= 0) return;
					Calendar.setWeatherTrend(field, num);
					setTimeout(() => {
						Menu.adminMenu();
					}, 500);
					break;
				case 'forcetrend':
					if (errorCheck(131, 'exists', field, 'field')) return;
					Calendar.forceWeatherTrend(field);
					setTimeout(() => {
						Menu.adminMenu();
					}, 500);
					break;
				case 'modify':
					if (errorCheck(132, 'exists', newItem, 'newItem')) return;
					if (errorCheck(133, 'number', newItem, 'newItem')) return;
					if (errorCheck(134, 'exists', unit, 'unit')) return;
					const number = Math.trunc(newItem);
					if (QUEST_TRACKER_WEATHER) {
						switch (unit.toLowerCase()) {
							case "years":
								if (number > 1) number = 1;
								break;
							case "days":
								if (number > 500) number = 500;
								break;
							case "weeks":
								if (number > 60) number = 60;
								break;
							case "months":
								if (number > 15) number = 15;
								break;
							default:
								break;
						}
					}
					Calendar.modifyDate({type: unit, amount: number});
					if (menu) {
						setTimeout(() => {
							Menu.adjustDate();
						}, 500);
					}
					else if (home) {
						setTimeout(() => {
							Menu.generateGMMenu();
						}, 500);
					}
					else {
						setTimeout(() => {
							Menu.buildWeather();
						}, 500);
					}
					break;
				default:
					errorCheck(136, 'msg', null,`Unknown date command: ${params.action}`);
					break;
			}
		} else if (command === '!qt-import') {
			Import.fullImportProcess();
		} else if (command === '!qt-config') {
			const { action, value, confirmation, type } = params;
			if (action === 'togglereadableJSON'){
				if (errorCheck(137, 'exists', value, 'value')) return;
				Utils.togglereadableJSON(value);
				setTimeout(() => {
					Menu.adminMenu();
				}, 500);
			} else if (action === 'toggleWeather'){
				if (errorCheck(138, 'exists', value, 'value')) return;
				Utils.toggleWeather(value);
				setTimeout(() => {
					Menu.adminMenu();
				}, 500);
			} else if (action === 'togglejumpgate'){
				if (errorCheck(139, 'exists', value, 'value')) return;
				Utils.toggleJumpGate(value);
				setTimeout(() => {
					Menu.adminMenu();
				}, 500);
			} else if (action === 'toggleVerboseErrors'){
				if (errorCheck(140, 'exists', value, 'value')) return;
				Utils.toggleVerboseError(value);
				setTimeout(() => {
					Menu.adminMenu();
				}, 500);
			} else if (action === 'toggleimperial'){
				if (errorCheck(150, 'exists', value, 'value')) return;
				if (errorCheck(151, 'exists', type, 'type')) return;
				Utils.toggleImperial(type,value);
				setTimeout(() => {
					Menu.adminMenu();
				}, 500);
			} else if (action === 'reset') {
				if (!errorCheck(141, 'confirmation', confirmation, 'CONFIRM')) return;
				state.QUEST_TRACKER = {};
				initializeQuestTrackerState(true);
				loadQuestTrackerData();
				QUEST_TRACKER_HISTORICAL_WEATHER = {};
				Utils.updateHandoutField("weather");
				saveQuestTrackerData();
				setTimeout(() => {
					Menu.adminMenu();
				}, 500);
			} else if (action === 'checkVersion'){
				checkVersion();
				setTimeout(() => {
					Menu.adminMenu();
				}, 500);
			}
		} else if (command === '!qt-questtree') {
			const { action, value, force = false } = params;
			if (errorCheck(142, 'exists', action, 'action')) return;
			switch (action) {
				case 'build':
					QuestPageBuilder.buildQuestTreeOnPage(force === true || force === 'true');
					break;
				default:
					errorCheck(143, 'msg', null, `Unknown action: ${action}`);
					break;
			}
		} 
		else {
			errorCheck(144, 'msg', null,`Unknown command: ${command}`);
		}
	};
	const errorCheck = (id = 0, type = null, data = null, check = null) => {
		switch (type) {
			case 'confirmation':
				if (data === check) return true;
				else {
					switch (check) {
						case 'CONFIRM':
							Utils.sendGMMessage(`Error ${id}: Confirmation required to reset all data. Please type CONFIRM when prompted.`);
							break;
						case 'DELETE':
							Utils.sendGMMessage(`Error ${id}: Confirmation required to delete location. Please type DELETE to confirm.`);
							break;
					}
				}
				break;
			case 'date':
				if (!/^\d+-\d+-\d+$/.test(data)) {
					Utils.sendGMMessage(`Error ${id}: Invalid date format: ${data}. Must be digits separated by dashes (e.g., YYYY-MM-DD or similar).`);
					return true
				}
				break;
			case 'exists':
				if (data === null) {
					if (QUEST_TRACKER_verboseErrorLogging) Utils.sendGMMessage(`Error ${id}: The variable ${check} does not exist.`);
					return true;
				}
				break;
			case 'msg':
				Utils.sendGMMessage(`Error ${id}: ${check}`);
				break;
			case 'number':
				if (isNaN(data)) {
					if (QUEST_TRACKER_verboseErrorLogging) Utils.sendGMMessage(`Error ${id}: ${check} is not a number.`);
					return true;
				}
				break;
		}
		return false;
	};
	return {
		CALENDARS,
		WEATHER,
		loadQuestTrackerData,
		saveQuestTrackerData,
		handleInput,
		Import,
		Calendar,
		Quest,
		Statuses,
		Flags,
		Triggers,
		Rumours,
		QuestPageBuilder,
		Menu,
		errorCheck,
		initializeQuestTrackerState,
		getCalendarAndWeatherData,
		checkVersion
	};
})();
on('ready', function () {
	'use strict';
	const { CALENDARS, WEATHER } = QuestTracker.getCalendarAndWeatherData();
	if (!CALENDARS || !WEATHER) return;
	QuestTracker.initializeQuestTrackerState();
	QuestTracker.loadQuestTrackerData();
	QuestTracker.checkVersion();
	on('chat:message', function(msg) {
		QuestTracker.handleInput(msg);
	});
});
