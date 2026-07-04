// Language detection patterns and responses database
        const languagePatterns = {
            english: { 
                pattern: /^(hello|hi|hey|how|what|where|when|why|i have|my|i feel|chest|pain|headache|fever|cough|vomit|diarrhea|bleeding|breathing|heart|stomach|back|throat|ear|eye|skin|rash|burn|cut|injury|accident|fall|faint|seizure|allergy)/i,
                greeting: "Hello! How can I help you with your medical concerns today?",
                name: "English"
            },
            hindi: {
                pattern: /^(नमस्ते|हेलो|मुझे|मेरा|दर्द|बुखार|खांसी|उल्टी|सांस|सीने में दर्द|सिर दर्द|पेट दर्द|चक्कर|बेहोशी|चोट|खून|एलर्जी)/,
                greeting: "नमस्ते! आज मैं आपकी चिकित्सा समस्या में कैसे मदद कर सकता हूँ?",
                name: "हिंदी"
            },
            spanish: {
                pattern: /^(hola|tengo|me duele|dolor|fiebre|tos|vómito|respiración|pecho|cabeza|estómago|sangre|alergia)/i,
                greeting: "¡Hola! ¿Cómo puedo ayudarle con sus problemas médicos hoy?",
                name: "Español"
            },
            french: {
                pattern: /^(bonjour|j'ai|douleur|fièvre|toux|vomissement|respiration|poitrine|tête|estomac|sang|allergie)/i,
                greeting: "Bonjour! Comment puis-je vous aider avec vos problèmes médicaux aujourd'hui?",
                name: "Français"
            },
            german: {
                pattern: /^(hallo|ich habe|schmerz|fieber|husten|erbrechen|atmung|brust|kopf|magen|blut|allergie)/i,
                greeting: "Hallo! Wie kann ich Ihnen heute bei Ihren medizinischen Problemen helfen?",
                name: "Deutsch"
            },
            tamil: {
                pattern: /^(வணக்கம்|எனக்கு|வலி|காய்ச்சல்|இருமல்|வாந்தி|மூச்சு|மார்பு|தலை|வயிறு|இரத்தம்|ஒவ்வாமை)/,
                greeting: "வணக்கம்! உங்கள் மருத்துவ பிரச்சினைகளுக்கு நான் எவ்வாறு உதவ முடியும்?",
                name: "தமிழ்"
            },
            telugu: {
                pattern: /^(నమస్కారం|నాకు|నొప్పి|జ్వరం|దగ్గు|వాంతులు|శ్వాస|ఛాతీ|తల|కడుపు|రక్తం|అలర్జీ)/,
                greeting: "నమస్కారం! నేను మీ వైద్య సమస్యలకు ఎలా సహాయపడగలను?",
                name: "తెలుగు"
            }
        };

        let currentLanguage = 'english';
        let isRecording = false;
        let recognition = null;
        let awaitingResponse = false;

        // Initialize speech recognition
        function initSpeechRecognition() {
            if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
                recognition = new SpeechRecognition();
                recognition.continuous = false;
                recognition.interimResults = false;
                recognition.lang = 'en-US';
                
                recognition.onstart = () => {
                    isRecording = true;
                    document.getElementById('voiceBtn').classList.add('recording');
                    document.getElementById('voiceIcon').className = 'fas fa-stop';
                    addTypingIndicator('Listening... 🎤', 'user');
                };
                
                recognition.onend = () => {
                    isRecording = false;
                    document.getElementById('voiceBtn').classList.remove('recording');
                    document.getElementById('voiceIcon').className = 'fas fa-microphone';
                };
                
                recognition.onresult = (event) => {
                    const transcript = event.results[0][0].transcript;
                    document.getElementById('textInput').value = transcript;
                    sendMessage();
                };
                
                recognition.onerror = (event) => {
                    console.error('Speech recognition error:', event.error);
                    isRecording = false;
                    document.getElementById('voiceBtn').classList.remove('recording');
                    document.getElementById('voiceIcon').className = 'fas fa-microphone';
                    addMessage('Sorry, I couldn\'t hear you clearly. Please type your symptoms or try again.', 'assistant');
                };
            } else {
                alert('Your browser does not support voice input. Please use text input instead.');
            }
        }

        // Toggle voice input
        function toggleVoiceInput() {
            if (!recognition) {
                initSpeechRecognition();
            }
            
            if (isRecording) {
                recognition.stop();
            } else {
                recognition.start();
            }
        }

        // Detect language from text
        function detectLanguage(text) {
            for (const [lang, data] of Object.entries(languagePatterns)) {
                if (data.pattern.test(text.toLowerCase())) {
                    return lang;
                }
            }
            return 'english';
        }

        // Healthcare-only response validation
        const healthcareKeywords = [
            'symptom', 'pain', 'fever', 'cough', 'vomit', 'diarrhea', 'bleeding', 'breathing', 
            'chest', 'headache', 'stomach', 'back', 'throat', 'ear', 'eye', 'skin', 'rash', 
            'burn', 'cut', 'injury', 'accident', 'fall', 'faint', 'seizure', 'allergy', 
            'medicine', 'prescription', 'doctor', 'hospital', 'emergency', 'ambulance', 
            'blood', 'pressure', 'heart', 'lung', 'kidney', 'liver', 'brain', 'nerve',
            'dizziness', 'nausea', 'swelling', 'infection', 'wound', 'fracture', 'sprain',
            'asthma', 'diabetes', 'migraine', 'stroke', 'heart attack'
        ];

        const healthcareTermsHindi = ['दर्द', 'बुखार', 'खांसी', 'उल्टी', 'सांस', 'चक्कर', 'चोट', 'खून'];
        const healthcareTermsSpanish = ['dolor', 'fiebre', 'tos', 'vómito', 'respiración', 'sangre'];
        const healthcareTermsFrench = ['douleur', 'fièvre', 'toux', 'vomissement', 'respiration', 'sang'];
        const healthcareTermsTamil = ['வலி', 'காய்ச்சல்', 'இருமல்', 'வாந்தி', 'மூச்சு', 'இரத்தம்'];
        const healthcareTermsTelugu = ['నొప్పి', 'జ్వరం', 'దగ్గు', 'వాంతులు', 'శ్వాస', 'రక్తం'];

        function isHealthcareRelated(text, language) {
            const lowerText = text.toLowerCase();
            
            // Check English keywords
            for (let keyword of healthcareKeywords) {
                if (lowerText.includes(keyword)) return true;
            }
            
            // Check language-specific keywords
            if (language === 'hindi') {
                for (let term of healthcareTermsHindi) {
                    if (text.includes(term)) return true;
                }
            }
            
            if (language === 'spanish') {
                for (let term of healthcareTermsSpanish) {
                    if (lowerText.includes(term)) return true;
                }
            }
            
            if (language === 'french') {
                for (let term of healthcareTermsFrench) {
                    if (lowerText.includes(term)) return true;
                }
            }
            
            if (language === 'tamil') {
                for (let term of healthcareTermsTamil) {
                    if (text.includes(term)) return true;
                }
            }
            
            if (language === 'telugu') {
                for (let term of healthcareTermsTelugu) {
                    if (text.includes(term)) return true;
                }
            }
            
            // Additional medical patterns
            const medicalPatterns = [
                /\b\d+\s*(?:year|month|day)s?\s+old\b/i,
                /\b(?:mg|mcg|gram|tablet|capsule|injection)\b/i,
                /\b(?:bp|ecg|ct|mri|x-?ray|ultrasound)\b/i
            ];
            
            for (let pattern of medicalPatterns) {
                if (pattern.test(text)) return true;
            }
            
            return false;
        }

        // Generate medical response based on symptoms
        function generateMedicalResponse(userInput, language) {
            const lowerInput = userInput.toLowerCase();
            
            // Chest pain (Critical)
            if (lowerInput.includes('chest pain') || lowerInput.includes('सीने में दर्द') || 
                lowerInput.includes('dolor de pecho') || lowerInput.includes('douleur thoracique')) {
                return getResponse('chest_pain', language);
            }
            
            // Difficulty breathing
            if (lowerInput.includes('difficulty breathing') || lowerInput.includes('shortness of breath') ||
                lowerInput.includes('सांस लेने में तकलीफ') || lowerInput.includes('respiración dificultosa')) {
                return getResponse('breathing', language);
            }
            
            // Severe bleeding
            if (lowerInput.includes('bleeding') || lowerInput.includes('खून बह रहा') || 
                lowerInput.includes('sangrado') || lowerInput.includes('saignement')) {
                return getResponse('bleeding', language);
            }
            
            // Head injury
            if (lowerInput.includes('head injury') || lowerInput.includes('सिर में चोट') || 
                lowerInput.includes('lesión en la cabeza')) {
                return getResponse('head_injury', language);
            }
            
            // Stroke symptoms
            if ((lowerInput.includes('stroke') || lowerInput.includes('paralysis') || 
                 lowerInput.includes('face drooping') || lowerInput.includes('arm weakness') ||
                 lowerInput.includes('speech difficulty'))) {
                return getResponse('stroke', language);
            }
            
            // Fever
            if (lowerInput.includes('fever') || lowerInput.includes('बुखार') || 
                lowerInput.includes('fiebre') || lowerInput.includes('fièvre')) {
                return getResponse('fever', language);
            }
            
            // General response based on severity
            return getResponse('general', language);
        }

        function getResponse(type, language) {
            const responses = {
                chest_pain: {
                    english: "⚠️ **CRITICAL**: Chest pain could indicate a heart attack. Please call emergency services (911) immediately. While waiting, sit down, stay calm, and chew an aspirin if available (unless allergic). Do NOT drive yourself to the hospital.",
                    hindi: "⚠️ **गंभीर**: सीने में दर्द दिल के दौरे का संकेत हो सकता है। कृपया तुरंत एम्बुलेंस बुलाएं (108)। प्रतीक्षा करते समय बैठ जाएं, शांत रहें, और यदि उपलब्ध हो तो एस्पिरिन चबाएं (एलर्जी न हो तो)। स्वयं अस्पताल न जाएं।",
                    spanish: "⚠️ **CRÍTICO**: El dolor en el pecho podría indicar un ataque cardíaco. Llame a emergencias (911) de inmediato. Mientras espera, siéntese, mantenga la calma y mastique una aspirina si está disponible (a menos que sea alérgico). No conduzca al hospital.",
                    french: "⚠️ **CRITIQUE**: Une douleur thoracique pourrait indiquer une crise cardiaque. Appelez immédiatement les services d'urgence (15). En attendant, asseyez-vous, restez calme et mâchez de l'aspirine si disponible (sauf allergie). Ne conduisez pas à l'hôpital."
                },
                breathing: {
                    english: "⚠️ **URGENT**: Difficulty breathing requires immediate medical attention. Call emergency services or have someone drive you to the nearest ER. Try sitting upright, loosen tight clothing, and use any prescribed inhaler if available.",
                    hindi: "⚠️ **तत्काल**: सांस लेने में कठिनाई के लिए तत्काल चिकित्सा ध्यान देने की आवश्यकता है। एम्बुलेंस बुलाएं या किसी को नजदीकी आपातकालीन कक्ष ले जाने के लिए कहें। सीधे बैठने की कोशिश करें, तंग कपड़े ढीले करें।",
                    spanish: "⚠️ **URGENTE**: La dificultad para respirar requiere atención médica inmediata. Llame a emergencias o pida que lo lleven a la sala de emergencias más cercana. Intente sentarse erguido y afloje la ropa ajustada.",
                    french: "⚠️ **URGENT**: La difficulté à respirer nécessite une attention médicale immédiate. Appelez les urgences ou faites-vous conduire aux urgences les plus proches. Essayez de vous asseoir droit."
                },
                bleeding: {
                    english: "⚠️ **EMERGENCY**: Apply firm pressure to the wound with a clean cloth. Keep pressure for 15 minutes without lifting to check. If bleeding doesn't stop or is severe, call emergency services immediately.",
                    hindi: "⚠️ **आपातकालीन**: घाव पर साफ कपड़े से मजबूत दबाव डालें। जांचने के लिए बिना उठाए 15 मिनट तक दबाव बनाए रखें। यदि रक्तस्राव नहीं रुकता है, तो तुरंत एम्बुलेंस बुलाएं।",
                    spanish: "⚠️ **EMERGENCIA**: Aplique presión firme sobre la herida con un paño limpio. Mantenga presión durante 15 minutos sin levantar para verificar. Si el sangrado no se detiene, llame a emergencias.",
                    french: "⚠️ **URGENCE**: Appliquez une pression ferme sur la plaie avec un chiffon propre. Maintenez la pression pendant 15 minutes. Si le saignement ne s'arrête pas, appelez les urgences."
                },
                head_injury: {
                    english: "⚠️ **MEDICAL ALERT**: Head injuries can be serious. Watch for vomiting, confusion, unequal pupil size, or loss of consciousness. Seek immediate medical evaluation, especially if the person is on blood thinners.",
                    hindi: "⚠️ **चिकित्सा चेतावनी**: सिर की चोटें गंभीर हो सकती हैं। उल्टी, भ्रम, असमान पुतली के आकार या चेतना के नुकसान पर ध्यान दें। तत्काल चिकित्सा मूल्यांकन लें।",
                    spanish: "⚠️ **ALERTA MÉDICA**: Las lesiones en la cabeza pueden ser graves. Esté atento a vómitos, confusión, pupilas desiguales o pérdida del conocimiento. Busque evaluación médica inmediata.",
                    french: "⚠️ **ALERTE MÉDICALE**: Les blessures à la tête peuvent être graves. Surveillez les vomissements, la confusion, les pupilles inégales ou la perte de conscience. Consultez immédiatement un médecin."
                },
                stroke: {
                    english: "⚠️ **STROKE ALERT**: Remember FAST: Face drooping, Arm weakness, Speech difficulty, Time to call emergency. Note the time symptoms started. Do NOT give food, drink, or medication. Call emergency services NOW.",
                    hindi: "⚠️ **स्ट्रोक चेतावनी**: FAST याद रखें - चेहरा झुकना, हाथ में कमजोरी, बोलने में कठिनाई, तुरंत एम्बुलेंस बुलाएं। लक्षण शुरू होने का समय नोट करें। कुछ भी खाने-पीने न दें।",
                    spanish: "⚠️ **ALERTA DE DERRAME**: Recuerde RÁPIDO: Rostro caído, debilidad en brazo, dificultad para hablar, llame a emergencias. No dé comida, bebida ni medicamentos.",
                    french: "⚠️ **ALERTE AVC**: Souvenez-vous de VITE: Visage tombant, faiblesse du bras, difficulté à parler, appelez les urgences. Ne donnez rien à manger ni à boire."
                },
                fever: {
                    english: "🩺 **Medical Assessment**: For fever above 101°F (38.3°C), stay hydrated, rest, and take acetaminophen (Tylenol) as directed. Seek care if fever persists beyond 3 days, or if accompanied by stiff neck, rash, or confusion.",
                    hindi: "🩺 **चिकित्सा मूल्यांकन**: 101°F (38.3°C) से अधिक बुखार के लिए, हाइड्रेटेड रहें, आराम करें, और निर्देशित पेरासिटामोल लें। 3 दिनों से अधिक बुखार रहने पर डॉक्टर से मिलें।",
                    spanish: "🩺 **Evaluación Médica**: Para fiebre superior a 38.3°C, manténgase hidratado, descanse y tome paracetamol según indicaciones. Busque atención si la fiebre persiste más de 3 días.",
                    french: "🩺 **Évaluation Médicale**: Pour une fièvre supérieure à 38.3°C, restez hydraté, reposez-vous et prenez du paracétamol. Consultez si la fièvre persiste plus de 3 jours."
                },
                general: {
                    english: "🩺 I understand you're experiencing symptoms. Based on your description, please monitor your condition. Seek immediate medical attention if symptoms worsen, you have difficulty breathing, chest pain, severe headache, or confusion. Would you like me to help find nearby hospitals?",
                    hindi: "🩺 मैं समझता हूं कि आप लक्षणों का अनुभव कर रहे हैं। कृपया अपनी स्थिति पर नज़र रखें। यदि लक्षण बिगड़ते हैं, सांस लेने में कठिनाई होती है, सीने में दर्द होता है, तो तुरंत चिकित्सा सहायता लें। क्या आप चाहेंगे कि मैं नजदीकी अस्पताल खोजने में मदद करूं?",
                    spanish: "🩺 Entiendo que está experimentando síntomas. Vigile su condición. Busque atención médica inmediata si los síntomas empeoran, tiene dificultad para respirar, dolor en el pecho, dolor de cabeza intenso o confusión. ¿Le ayudo a encontrar hospitales cercanos?",
                    french: "🩺 Je comprends que vous ressentez des symptômes. Surveillez votre état. Consultez immédiatement si les symptômes s'aggravent, difficulté respiratoire, douleur thoracique, mal de tête sévère ou confusion. Voulez-vous que je vous aide à trouver des hôpitaux proches?"
                }
            };
            
            return responses[type][language] || responses['general'][language];
        }

        // Add message to chat
        function addMessage(text, sender, language = null) {
            const messagesContainer = document.getElementById('chatMessages');
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${sender === 'user' ? 'user' : ''}`;
            
            const avatar = document.createElement('div');
            avatar.className = 'message-avatar';
            avatar.innerHTML = sender === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-user-md"></i>';
            
            const contentDiv = document.createElement('div');
            contentDiv.className = 'message-content';
            contentDiv.innerHTML = text;
            
            const timeSpan = document.createElement('div');
            timeSpan.className = 'message-time';
            timeSpan.innerText = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            contentDiv.appendChild(timeSpan);
            
            messageDiv.appendChild(avatar);
            messageDiv.appendChild(contentDiv);
            messagesContainer.appendChild(messageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        // Add typing indicator
        function addTypingIndicator(text, type) {
            const messagesContainer = document.getElementById('chatMessages');
            const typingDiv = document.createElement('div');
            typingDiv.className = `message ${type === 'user' ? 'user' : ''}`;
            typingDiv.id = 'typingIndicator';
            
            const contentDiv = document.createElement('div');
            contentDiv.className = 'message-content';
            
            if (type === 'assistant') {
                contentDiv.innerHTML = `
                    <div class="typing-indicator">
                        <span></span><span></span><span></span>
                    </div>
                    <div style="margin-top: 5px; font-size: 0.75rem; color: var(--gray);">${text || 'Dr. AI is thinking...'}</div>
                `;
            } else {
                contentDiv.innerHTML = text;
            }
            
            typingDiv.appendChild(contentDiv);
            messagesContainer.appendChild(typingDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        function removeTypingIndicator() {
            const indicator = document.getElementById('typingIndicator');
            if (indicator) indicator.remove();
        }

        // Handle key press
        function handleKeyPress(event) {
            if (event.key === 'Enter') {
                sendMessage();
            }
        }

        // Main send message function
        async function sendMessage() {
            if (awaitingResponse) return;
            
            const inputField = document.getElementById('textInput');
            const message = inputField.value.trim();
            
            if (!message) return;
            
            // Add user message
            addMessage(message, 'user');
            inputField.value = '';
            
            awaitingResponse = true;
            
            // Detect language
            const detectedLang = detectLanguage(message);
            currentLanguage = detectedLang;
            document.getElementById('detectedLanguage').innerText = languagePatterns[detectedLang].name;
            
            // Check if healthcare related
            if (!isHealthcareRelated(message, detectedLang)) {
                addTypingIndicator('', 'assistant');
                setTimeout(() => {
                    removeTypingIndicator();
                    const nonMedicalResponse = {
                        english: "I'm your emergency medical assistant. I can only help with health-related questions and symptoms. Please describe any medical concerns or symptoms you're experiencing, and I'll provide appropriate guidance.",
                        hindi: "मैं आपका आपातकालीन चिकित्सा सहायक हूं। मैं केवल स्वास्थ्य से संबंधित प्रश्नों और लक्षणों में मदद कर सकता हूं। कृपया किसी भी चिकित्सा चिंता या लक्षण का वर्णन करें।",
                        spanish: "Soy su asistente médico de emergencia. Solo puedo ayudar con preguntas relacionadas con la salud y síntomas. Describa cualquier problema médico o síntoma que esté experimentando.",
                        french: "Je suis votre assistant médical d'urgence. Je ne peux aider qu'avec les questions de santé et les symptômes. Décrivez vos préoccupations médicales ou symptômes.",
                        tamil: "நான் உங்கள் அவசர மருத்துவ உதவியாளர். நான் ஆரோக்கியம் தொடர்பான கேள்விகள் மற்றும் அறிகுறிகளுக்கு மட்டுமே உதவ முடியும். தயவுசெய்து உங்கள் மருத்துவ கவலைகளை விவரிக்கவும்.",
                        telugu: "నేను మీ అత్యవసర వైద్య సహాయకుడిని. నేను ఆరోగ్య సంబంధిత ప్రశ్నలు మరియు లక్షణాలకు మాత్రమే సహాయపడగలను. దయచేసి మీ వైద్య సమస్యలను వివరించండి."
                    };
                    addMessage(nonMedicalResponse[detectedLang] || nonMedicalResponse.english, 'assistant');
                    awaitingResponse = false;
                }, 1500);
                return;
            }
            
            // Generate medical response
            addTypingIndicator('Analyzing your symptoms... 🔍', 'assistant');
            
            setTimeout(() => {
                removeTypingIndicator();
                const medicalResponse = generateMedicalResponse(message, detectedLang);
                addMessage(medicalResponse, 'assistant', detectedLang);
                awaitingResponse = false;
                
                // Offer hospital search for serious conditions
                if (message.toLowerCase().includes('chest') || message.toLowerCase().includes('bleeding') || 
                    message.toLowerCase().includes('breath') || message.toLowerCase().includes('stroke')) {
                    setTimeout(() => {
                        addMessage("🏥 Would you like me to find the nearest hospital with emergency services? Just say 'yes' or 'no'.", 'assistant');
                    }, 1000);
                }
            }, 2000);
        }

        // Emergency trigger
        function triggerEmergency() {
            addMessage("🚨 **EMERGENCY PROTOCOL ACTIVATED** 🚨\n\nPlease call your local emergency number immediately:\n• USA/Canada: 911\n• UK: 999\n• India: 108/112\n• EU: 112\n\nI'm staying on the line to assist you until help arrives. What symptoms are you experiencing?", 'assistant');
            
            // Add hospital search suggestion
            setTimeout(() => {
                addMessage("📍 While waiting for emergency services, would you like me to locate the nearest hospital to your position? Reply with your city name or 'share location'.", 'assistant');
            }, 3000);
        }

        // Initialize on page load
        document.addEventListener('DOMContentLoaded', () => {
            initSpeechRecognition();
            
            // Add welcome message with animation
            setTimeout(() => {
                addMessage("👋 I'm here to help with any medical emergency or health concerns. Remember: For life-threatening emergencies, always call emergency services first.", 'assistant');
            }, 1000);
        });