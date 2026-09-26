"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrationService = void 0;
var common_1 = require("@nestjs/common");
var client_1 = require("@prisma/client");
var IntegrationService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var IntegrationService = _classThis = /** @class */ (function () {
        function IntegrationService_1(prisma, sandboxEmail, productionEmail, logger) {
            this.prisma = prisma;
            this.sandboxEmail = sandboxEmail;
            this.productionEmail = productionEmail;
            this.logger = logger;
        }
        IntegrationService_1.prototype.sendEmail = function (companyId, environment, payload, actorId) {
            return __awaiter(this, void 0, void 0, function () {
                var auditLog, provider, response, result, isProdEnabled, testRecipient, result, error_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.integrationAuditLog.create({
                                data: {
                                    companyId: companyId,
                                    action: 'SEND_EMAIL',
                                    environment: environment,
                                    status: 'PENDING',
                                    requestPayload: JSON.parse(JSON.stringify(payload)),
                                    actorId: actorId,
                                },
                            })];
                        case 1:
                            auditLog = _a.sent();
                            _a.label = 2;
                        case 2:
                            _a.trys.push([2, 9, , 11]);
                            return [4 /*yield*/, this.prisma.providerIntegration.findFirst({
                                    where: {
                                        companyId: companyId,
                                        capabilityType: 'EMAIL',
                                        environment: environment,
                                        status: client_1.IntegrationStatus.ACTIVE,
                                    },
                                })];
                        case 3:
                            provider = _a.sent();
                            response = void 0;
                            if (!(environment === client_1.ExecutionEnvironment.SIMULATION || environment === client_1.ExecutionEnvironment.SANDBOX)) return [3 /*break*/, 5];
                            // M1: Use actual SandboxEmailProvider
                            this.logger.log("[".concat(environment, "] Delegating email to SandboxEmailProvider"), IntegrationService.name, { companyId: companyId, environment: environment, auditLogId: auditLog.id, action: 'SEND_EMAIL' });
                            return [4 /*yield*/, this.sandboxEmail.send(payload)];
                        case 4:
                            result = _a.sent();
                            response = { success: result.success, message: result.message, referenceId: result.referenceId };
                            return [3 /*break*/, 7];
                        case 5:
                            if (!provider && !process.env.SMTP_HOST) {
                                throw new Error('NOT_IMPLEMENTED: No active email provider configured for PRODUCTION');
                            }
                            isProdEnabled = process.env.ENABLE_REAL_PRODUCTION_SENDING === 'true';
                            if (!isProdEnabled) {
                                testRecipient = process.env.TEST_EMAIL_RECIPIENT;
                                if (!testRecipient || testRecipient.trim() === '') {
                                    throw new Error('TEST_EMAIL_RECIPIENT is missing or empty. The system is in test mode and fails closed to prevent sending real emails.');
                                }
                                if (payload.to !== testRecipient) {
                                    this.logger.log("[TEST MODE] Redirecting email from ".concat(payload.to, " to ").concat(testRecipient));
                                    payload.to = testRecipient;
                                }
                            }
                            return [4 /*yield*/, this.productionEmail.send(payload)];
                        case 6:
                            result = _a.sent();
                            response = { success: result.success, message: result.message, referenceId: result.referenceId };
                            _a.label = 7;
                        case 7: return [4 /*yield*/, this.prisma.integrationAuditLog.update({
                                where: { id: auditLog.id },
                                data: {
                                    status: 'SUCCESS',
                                    responsePayload: JSON.parse(JSON.stringify(response)),
                                    integrationId: provider === null || provider === void 0 ? void 0 : provider.id,
                                },
                            })];
                        case 8:
                            _a.sent();
                            return [2 /*return*/, response];
                        case 9:
                            error_1 = _a.sent();
                            return [4 /*yield*/, this.prisma.integrationAuditLog.update({
                                    where: { id: auditLog.id },
                                    data: {
                                        status: 'FAILED',
                                        error: error_1.message,
                                    },
                                })];
                        case 10:
                            _a.sent();
                            throw error_1;
                        case 11: return [2 /*return*/];
                    }
                });
            });
        };
        return IntegrationService_1;
    }());
    __setFunctionName(_classThis, "IntegrationService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        IntegrationService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return IntegrationService = _classThis;
}();
exports.IntegrationService = IntegrationService;
