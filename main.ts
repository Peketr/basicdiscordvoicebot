import * as Discord from 'discord.js';
import { joinVoiceChannel,createAudioPlayer,createAudioResource, getVoiceConnection, getVoiceConnections, AudioPlayer, AudioResource,AudioPlayerStatus } from  '@discordjs/voice';
const token = process.env.radioToken;

const client = new Discord.Client({ intents: [Discord.Intents.FLAGS.GUILDS,Discord.Intents.FLAGS.GUILD_MESSAGES,Discord.Intents.FLAGS.GUILD_VOICE_STATES] } as Discord.ClientOptions);
var audioPlayer:AudioPlayer;
//var splinter:AudioResource;

client.on('ready', async () => {
	console.log(`${client.user.tag}: client online, on ${client.guilds.cache.size} guilds, with ${client.users.cache.size} users.`);
	const conn = getVoiceConnections()
	conn.forEach(connection => {
		console.log('rip');
		connection.disconnect();
	});
});

var channel:Discord.TextBasedChannels;
var queue:AudioResource[];
var currentPlay:AudioResource;
queue=[];



client.on('messageCreate', async (message) => {
	if (message.guild == null) return;
	if (message.content.startsWith('.j')){
		const voiceChannel: Discord.VoiceChannel = message.member.voice.channel as Discord.VoiceChannel;
		if (!voiceChannel){
			message.channel.send('Nem vagy csatornán >:^(');
			return;
		}
		try {
			await message.channel.send('**Csatlakozva.**');
			let connection = getVoiceConnection(voiceChannel.guildId);
			if (!connection){
				connection = joinVoiceChannel({
					channelId: voiceChannel.id,
					guildId: voiceChannel.guildId,
					//@ts-ignore
					adapterCreator: voiceChannel.guild.voiceAdapterCreator
				});
				audioPlayer = createAudioPlayer();
				audioPlayer.on('stateChange',(oldState,newState)=>{
					if (oldState.status==AudioPlayerStatus.Playing && newState.status==AudioPlayerStatus.Idle) {
						if (queue.length>0) {
							currentPlay=queue.shift();
							audioPlayer.play(currentPlay);
						}
							 
						else channel.send('Elfogyott:(')
					}
				});
				channel = message.channel;
				connection.subscribe(audioPlayer);
			}
			const toplay = message.content.slice(3,message.content.length);
			if (toplay && !toplay.includes('..')){
				const path_to_music = './'.concat(toplay.concat('.mp3'));
				const splinter = createAudioResource(path_to_music,{inlineVolume:true});
				if (audioPlayer.state.status=='idle'){
					message.channel.send('playing: '.concat(path_to_music));
					currentPlay=splinter;
					audioPlayer.play(currentPlay);
				}
				else{
					message.channel.send('queued: '.concat(path_to_music));
					queue.push(splinter);
				}
			}
			
		}
		catch (e) {
			console.error(e);
			message.channel.send('**Hiba a csatlakozás során.**');
		}
	} else if (message.content.toLowerCase()=='.p'){
		if (audioPlayer.state.status==AudioPlayerStatus.Playing)
			audioPlayer.pause();
		else
			audioPlayer.unpause();
	} else if (message.content.toLowerCase()=='.q'){
		if (audioPlayer.state.status!='idle')
			audioPlayer.stop();
		audioPlayer = undefined;
		const connection = getVoiceConnection(message.guild.id);
		connection.disconnect();
		connection.destroy();
	} else if (message.content.toLowerCase()=='.s'){
		message.channel.send(audioPlayer.state.status);
		message.channel.send('length'+audioPlayer.playable.length);
		message.channel.send(audioPlayer.checkPlayable()?'playable':'notplayable');
		const asd =Array.from(getVoiceConnections(),([key,_])=>key).map((value)=>client.guilds.resolve(value));
		console.log(asd);
		//message.channel.send(splinter.readable?'readable':'notreadable');
	} else if (message.content.toLowerCase().startsWith('.v') && currentPlay){
		const voltoset=message.content.toLowerCase().slice(3);
		const volnum=Number.parseFloat(voltoset);
		currentPlay.volume.setVolume(volnum);
		console.log('volume set to '.concat(currentPlay.volume.volume.toString()));
	}
	
});

client.on('voiceStateUpdate', (oldState, newState) => {
	if (oldState.member?.user == client.user) {
		if (!newState.channel) {//ha a bot szabályosan kilép VAGY elküldik - régen ilyen nem volt :))
			console.log('kthxbye');
		}
		else //ha a botot átrakják egy voice channelből egy másikba - át kell iratkoznia
			console.log('hmmmmm');
	}
	if (oldState.member?.user.bot) //innen csak nem botokra figyelünk
		return;
});

client.on("error", error => Promise.reject(error));

function forceLogin(): Promise<any> {
	return client.login(token).catch(_ => {
		console.log('Login failed, retrying...');
		return forceLogin();
	});
}

forceLogin();
