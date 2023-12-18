const { ButtonBuilder, ButtonStyle, EmbedBuilder, ActionRowBuilder } = require('discord.js');
const { Users, Subscriptions } = require('../../data/models.js');
const logger  = require('../../utils/logger.js')

module.exports.help = {
    name : 'subscribe',
    description : "Subscription to get notifications for each prayer of the day according to the desired city",
    options: [
        {
            name: 'city',
            description: 'The city you are in',
            type: 3,
            required: true,
        },
        {
            name: 'country',
            description: 'The country you want to know the prayer times',
            type: 3,
            required: true,
        },
    ],
}

module.exports.run = async (interaction) => {

    const queryCountry = interaction.options.getString('country')
    const queryCity = interaction.options.getString('city')
    const city = queryCity.charAt(0).toUpperCase() + queryCity.slice(1).toLowerCase()
    const country = queryCountry.charAt(0).toUpperCase() + queryCountry.slice(1).toLowerCase()

    if(!city || !country) return interaction.reply("You must specify a city and a country")

    const confirm = new ButtonBuilder()
        .setCustomId('confirm')
        .setLabel('Confirm')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Primary);

    const cancel = new ButtonBuilder()
        .setCustomId('cancel')
        .setLabel('Cancel')
        .setEmoji('❌')
        .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder()
        .addComponents(cancel, confirm);

    const replyEmbed = new EmbedBuilder()
        .setTitle('Thank you ! 🙏')
        .setDescription('You will receive a message to confirm your subscription');
    await interaction.reply({ embeds: [replyEmbed], ephemeral: true });
    const response = await interaction.user.send({
        content: `Are you sure you want to receive notifications for prayers in ${city} ?`,
        components: [row],
    });

    const collectorFilter = i => i.user.id === interaction.user.id;

    try {
        const confirmation = await response.awaitMessageComponent({ filter: collectorFilter, time: 60000 });
        
        if (confirmation.customId === 'confirm') {
            
            let user = await Users().findOne({ where: { userId: interaction.user.id } })
            if(!user) {
                user = Users().build({ userId: interaction.user.id, guildId: interaction.guildId })
                await user.save()
            }

            let subscription = await Subscriptions().findOne({ where: { UserId: user.id, city: city, country: country } })
            if(subscription) {
                logger.info("Notification for prayer in", city, "already activated for", interaction.user.username)
                await confirmation.update({ content: `You already receive notifications for prayers in ${city}, ${country}`, components: [] })
                return
            }

            // Create subscription
            subscription = Subscriptions().build({ subscriptionEnabled: true,city: city, country: country, UserId: user.id })
            await subscription.save()
            logger.info("Notification for prayer in", city, "activated for", interaction.user.username)

            // Confirmation message
            await confirmation.update({ content: `You will receive notifications for prayers in ${city}`, components: [] })
            await confirmation.message.react('✅');
            confirm.setDisabled(true);
            cancel.setDisabled(true);
            return;
        } else if (confirmation.customId === 'cancel') {
            await confirmation.update({ content: 'Action cancelled', components: [] });
        }
    } catch (e) {
        logger.error(e);
        await interaction.editReply({ content: 'Confirmation not received within 1 minute, cancelling', components: [] });
    }
}