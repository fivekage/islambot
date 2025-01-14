const { EmbedBuilder } = require('discord.js');
const vars = require('../_general/vars.js');
const logger = require('../../utils/logger.js');
const { retrievePrayersOfTheDay } = require('../../utils/retrieve_prayers.js');
const { CountriesAPI } = require('../../apis/countries_api.js');

const countriesAPI = new CountriesAPI();
(async () => {
   await countriesAPI.initialize(); // Pre-fetch countries data
})();
const COUNTRY_PARAM_NAME = 'country';
const CITY_PARAM_NAME = 'city';

module.exports.help = {
   name: 'prayer',
   description: 'Returns the times of each Muslim prayer according to the desired city',
   options: [
      {
         name: 'country',
         description: 'The country you want to know the prayer times',
         type: 3,
         required: true,
         autocomplete: true
      },
      {
         name: 'city',
         description: 'The city you want to know the prayer times',
         type: 3,
         required: true,
         autocomplete: true
      },
   ],
};

module.exports.getTimesFromIsoDatetime = (date, timezone) => {
   const dateObject = new Date(date);

   const dateTimezone = dateObject.toLocaleString('en-GB', {
      timeZone: timezone,
   });
   return dateTimezone.split(', ')[1].split(':').slice(0, 2).join(':');
};

module.exports.run = (_client, interaction) => {
   const queryCountry = interaction.options.getString('country');
   const queryCity = interaction.options.getString('city');
   const city = queryCity.charAt(0).toUpperCase() + queryCity.slice(1).toLowerCase();
   const country = queryCountry.charAt(0).toUpperCase() + queryCountry.slice(1).toLowerCase();

   if (!city || !country) {
      return interaction.reply({
         content: 'You must specify a city and a country',
         ephemeral: true,
      });
   }

   const timezone = 'timezone';

   retrievePrayersOfTheDay(city, country, 1, true)
      .then((data) => {
         const embed = new EmbedBuilder()
            .setTitle(`Prayer times for ${city}, ${country}`)
            .setColor(vars.primaryColor)
            .setAuthor({ name: `For you ${interaction.user.username}` })
            .setThumbnail('https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExc2syc3F3ODZpaW50MnQ1ZzVwYWdhbXl6em5zcHMzOTVqMmhseGhhNSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/12ihpr4WmwKJsQ/giphy.gif')
            .addFields(
               { name: ':clock1: **Fajr**', value: `${this.getTimesFromIsoDatetime(data.Fajr, data[timezone])}`, inline: true },
               { name: ':clock2: **Sunrise**', value: ` ${this.getTimesFromIsoDatetime(data.Sunrise, data[timezone])}`, inline: true },
               { name: ':clock3: **Dhuhr**', value: `${this.getTimesFromIsoDatetime(data.Dhuhr, data[timezone])}`, inline: true },
               { name: ':clock4: **Asr**', value: `${this.getTimesFromIsoDatetime(data.Asr, data[timezone])}`, inline: true },
               { name: ':clock5: **Maghrib**', value: `${this.getTimesFromIsoDatetime(data.Maghrib, data[timezone])}`, inline: true },
               { name: ':clock6: **Isha**', value: `${this.getTimesFromIsoDatetime(data.Isha, data[timezone])}`, inline: true },
            )
            .setURL(vars.topggUrl)
            .setFooter({ text: vars.footerText });
         return interaction.reply({ embeds: [embed] });
      })
      .catch((error) => {
         logger.warn('Error during retrieve prayers', error);
         return interaction.reply({
            embeds: [
               new EmbedBuilder()
                  .setTitle('Location not found')
                  .setColor(vars.errorColor),
            ],
            ephemeral: true,
         });
      });
};

module.exports.autocomplete = async (interaction) => {
   const focusedOption = interaction.options.getFocused(true);
   const focusedValue = interaction.options.getFocused();
   let choices;

   if (focusedOption.name === COUNTRY_PARAM_NAME) {
      choices = countriesAPI.getCountriesName();
   }
   else if (focusedOption.name === CITY_PARAM_NAME) {
      // Get country value
      const countryName = interaction.options.getString(COUNTRY_PARAM_NAME);
      if (countryName === null) {
         choices = [];
      } else {
         choices = countriesAPI.getCountryCities(countryName);
      }
   }

   // Ensure focused value is processed correctly (case-insensitive search)
   const filtered = choices
      .filter(choice => {
         if (focusedValue === null) return true;
         return choice.toLowerCase().startsWith(focusedValue.toLowerCase())
      })
      .slice(0, 25); // Limit to 25 suggestions

   // Respond to the interaction within 3 seconds
   await interaction.respond(
      filtered.map(choice => ({ name: choice, value: choice }))
   ).catch(error => {
      throw new Error('Error responding to autocomplete interaction:', error);
   });
};
