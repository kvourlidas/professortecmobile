import { supabase } from '@/lib/supabaseClient';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [pw, setPw] = useState('');
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const canSubmit = useMemo(() => {
        return email.trim().length > 3 && pw.trim().length >= 6 && !pending;
    }, [email, pw, pending]);

    const onLogin = async () => {
        setError(null);
        setPending(true);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password: pw,
            });

            if (error || !data.session) {
                setError('Λάθος στοιχεία σύνδεσης.');
                return;
            }

            // ✅ session is now stored in Supabase client
            router.replace('/(tabs)/home');
        } catch (e) {
            setError('Κάτι πήγε στραβά. Δοκίμασε ξανά.');
        } finally {
            setPending(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.select({ ios: 'padding', android: undefined })}
            style={{ flex: 1 }}
        >
            <View
                style={{
                    flex: 1,
                    paddingHorizontal: 18,
                    justifyContent: 'center',
                    backgroundColor: '#0b1220',
                }}
            >
                <View
                    style={{
                        borderWidth: 1,
                        borderColor: 'rgba(148,163,184,0.25)',
                        borderRadius: 16,
                        padding: 16,
                        backgroundColor: 'rgba(15,23,42,0.65)',
                    }}
                >
                    <Text style={{ color: 'white', fontSize: 20, fontWeight: '700', textAlign: 'center' }}>
                        ProfessorTec
                    </Text>
                    <Text style={{ color: 'rgba(226,232,240,0.8)', fontSize: 12, marginTop: 6, textAlign: 'center' }}>
                        Σύνδεση στο mobile app
                    </Text>

                    {error && (
                        <View
                            style={{
                                marginTop: 14,
                                padding: 10,
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: 'rgba(239,68,68,0.55)',
                                backgroundColor: 'rgba(127,29,29,0.55)',
                            }}
                        >
                            <Text style={{ color: 'white', fontSize: 12 }}>{error}</Text>
                        </View>
                    )}

                    <View style={{ marginTop: 16 }}>
                        <Text style={{ color: 'rgba(226,232,240,0.9)', fontSize: 12, marginBottom: 6 }}>Email</Text>
                        <TextInput
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            placeholder="student@example.com"
                            placeholderTextColor="rgba(148,163,184,0.7)"
                            style={{
                                color: 'white',
                                borderWidth: 1,
                                borderColor: 'rgba(148,163,184,0.25)',
                                borderRadius: 12,
                                paddingHorizontal: 12,
                                paddingVertical: 10,
                                backgroundColor: 'rgba(2,6,23,0.35)',
                            }}
                        />
                    </View>

                    <View style={{ marginTop: 12 }}>
                        <Text style={{ color: 'rgba(226,232,240,0.9)', fontSize: 12, marginBottom: 6 }}>Κωδικός</Text>
                        <TextInput
                            value={pw}
                            onChangeText={setPw}
                            secureTextEntry
                            placeholder="••••••"
                            placeholderTextColor="rgba(148,163,184,0.7)"
                            style={{
                                color: 'white',
                                borderWidth: 1,
                                borderColor: 'rgba(148,163,184,0.25)',
                                borderRadius: 12,
                                paddingHorizontal: 12,
                                paddingVertical: 10,
                                backgroundColor: 'rgba(2,6,23,0.35)',
                            }}
                        />
                    </View>

                    <TouchableOpacity
                        onPress={onLogin}
                        disabled={!canSubmit}
                        style={{
                            marginTop: 16,
                            borderRadius: 12,
                            paddingVertical: 12,
                            alignItems: 'center',
                            backgroundColor: canSubmit ? '#fbbf24' : 'rgba(148,163,184,0.25)',
                        }}
                    >
                        <Text style={{ color: '#0b1220', fontWeight: '800' }}>
                            {pending ? 'Σύνδεση…' : 'Σύνδεση'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => Alert.alert('Επικοινώνησε με το φροντιστήριο', 'Για επαναφορά κωδικού.')}
                        style={{ marginTop: 12, alignItems: 'center' }}
                    >
                        <Text style={{ color: 'rgba(226,232,240,0.85)', fontSize: 12 }}>
                            Ξέχασες τον κωδικό;
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}
