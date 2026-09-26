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
exports.ProductionEmailProvider = void 0;
var common_1 = require("@nestjs/common");
var nodemailer = require("nodemailer");
var ProductionEmailProvider = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var ProductionEmailProvider = _classThis = /** @class */ (function () {
        function ProductionEmailProvider_1() {
            this.logger = new common_1.Logger(ProductionEmailProvider.name);
            this.apiKey = process.env.SENDGRID_API_KEY || '';
            this.fromEmail = process.env.FROM_EMAIL || '';
        }
        ProductionEmailProvider_1.prototype.send = function (payload) {
            return __awaiter(this, void 0, void 0, function () {
                var response, errorData, error_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (process.env.SMTP_HOST)
                                return [2 /*return*/, this.sendSmtp(payload)];
                            if (!this.apiKey) {
                                throw new Error('Production email provider is not configured properly (missing SENDGRID_API_KEY).');
                            }
                            if (!payload.to) {
                                throw new Error('Recipient email is required.');
                            }
                            this.logger.log("[PRODUCTION EMAIL] Sending email to ".concat(payload.to, " - Subject: ").concat(payload.subject));
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 5, , 6]);
                            return [4 /*yield*/, fetch('https://api.sendgrid.com/v3/mail/send', {
                                    method: 'POST',
                                    headers: {
                                        'Authorization': "Bearer ".concat(this.apiKey),
                                        'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                        personalizations: [{ to: [{ email: payload.to }] }],
                                        from: { email: this.fromEmail },
                                        subject: payload.subject,
                                        content: [{ type: 'text/plain', value: payload.body }],
                                    }),
                                })];
                        case 2:
                            response = _a.sent();
                            if (!!response.ok) return [3 /*break*/, 4];
                            return [4 /*yield*/, response.json().catch(function () { return null; })];
                        case 3:
                            errorData = _a.sent();
                            throw new Error("SendGrid API error: ".concat(response.status, " - ").concat(JSON.stringify(errorData)));
                        case 4:
                            this.logger.log("[PRODUCTION EMAIL] Successfully sent email to ".concat(payload.to));
                            return [2 /*return*/, {
                                    success: true,
                                    message: 'Email dispatched to SendGrid successfully',
                                    referenceId: "prod-email-".concat(Date.now())
                                }];
                        case 5:
                            error_1 = _a.sent();
                            this.logger.error("[PRODUCTION EMAIL] Failed to send email to ".concat(payload.to, ": ").concat(error_1.message));
                            throw error_1;
                        case 6: return [2 /*return*/];
                    }
                });
            });
        };
        /** SMTP (e.g. Gmail app password) — preferred over SendGrid when SMTP_HOST is set. */
        ProductionEmailProvider_1.prototype.sendSmtp = function (payload) {
            return __awaiter(this, void 0, void 0, function () {
                var info;
                var _a, _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            if (!payload.to)
                                throw new Error('Recipient email is required.');
                            (_a = this.transporter) !== null && _a !== void 0 ? _a : (this.transporter = nodemailer.createTransport({
                                host: process.env.SMTP_HOST,
                                port: Number((_b = process.env.SMTP_PORT) !== null && _b !== void 0 ? _b : 587),
                                secure: Number(process.env.SMTP_PORT) === 465,
                                auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
                            }));
                            return [4 /*yield*/, this.transporter.sendMail({
                                    from: "\"".concat((_c = process.env.OUTREACH_FROM_NAME) !== null && _c !== void 0 ? _c : 'AEVORA Team', "\" <").concat(process.env.SMTP_USER, ">"),
                                    to: payload.to,
                                    subject: payload.subject,
                                    text: payload.body,
                                })];
                        case 1:
                            info = _d.sent();
                            this.logger.log("[SMTP] Sent email to ".concat(payload.to, " (").concat(info.messageId, ")"));
                            return [2 /*return*/, { success: true, message: 'Sent via SMTP', referenceId: info.messageId }];
                    }
                });
            });
        };
        return ProductionEmailProvider_1;
    }());
    __setFunctionName(_classThis, "ProductionEmailProvider");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ProductionEmailProvider = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ProductionEmailProvider = _classThis;
}();
exports.ProductionEmailProvider = ProductionEmailProvider;
